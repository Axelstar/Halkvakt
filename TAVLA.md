# 📋 TAVLAN — allt på ett ställe

Tre kolumner. Claude flyttar kort automatiskt varje arbetsvarv; Axel och Bengt
flyttar genom att säga till i chatten ("flytta X till klart") eller redigera
direkt här på GitHub (pennikonen ↗). Regel: finns det inte på tavlan finns det inte.

*Uppdaterad: 2026-09-13 17:40 av Claude (webben) — kvällsavläsning ur kassavaktens egna tal: 15,23 av 35 USD, släpande 169 min/dygn, taket 28/9, issue #210 rätteligen öppen. Arkivtakten tillbaka på 21 281/dygn (mitt 40 500 var en fyratimmarsextrapolering). NYTT KORT #154: steg C:s regnfält når inte normalklassade blöta segment.*
  💰 **RÄTTAD 13/9 (DECISIONS #160, Bengts order):** prognosen räknade på månad-till-datum, och i
  det snittet låg fem flöden som lades ner 8–9/9 (`ingest-fi`, `-no`, `-dk`, `publish-map`,
  `regn-30`). Vakten sa **21 september**; uppmätt verklig takt var 232 min/dygn senaste dygnet och
  180 de två senaste, mot snittets 311. **Förbrukningen läses nu ur månadstalet, prognosen ur en
  SLÄPANDE takt** över de två senaste kompletta dygnen — taket flyttas därmed till **26 september**
  på verkliga tal. Båda talen står i varje larm: månadssnittet låser fast en takt som kan ha
  upphört, den släpande är känslig för en byggskur. Avviker de mer än 25 % säger larmet
  **TAKTEN ÄNDRAS**. Kostar noll extra API-anrop — dygnsloopen fanns redan.

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
   ⏰ KVÄLL 10/9 17:32: ingen deploy-supabase-körning efter 9/9 05:20, ingen ny vakthund-issue efter #91 (9/9)
   ⇒ Axel har inte roterat än. De fyra bevisen väntar.
   ⏰ MORGON 11/9 04:31: oförändrat — ingen deploy-supabase efter 9/9 05:20, ingen vakthund-issue efter #91.
   ⏰ **12/9 18:51: fortfarande INTE roterat.** Två saker ser ut som bevis men är det inte: deploy-supabase
   har körts 6 gånger sedan 9/9 (körning 3–8, senast 12/9 17:22) — men med tokenen från 9/9, inte en ny;
   och tre vakthund-issues (#109, #131, #151) är LARMPROV från DB-knappen, inte kedjebrott och inte
   rotationsbevis. Larmvägen är därmed bevisad tre gånger till. Rotationen väntar på Axel.
  ⏰ MORGON 13/9: fortfarande ej roterat, ingen rotationsnotis i STATUS/TAVLA/DECISIONS. ⚠️ OBS för
  framtida avläsningar: "finns en deploy-supabase-körning" duger INTE längre som indicium — jag körde
  den själv två gånger i natt för kassavakten. Bevis är en notis om NY nyckel, inget annat.
  ⏰ KVÄLL 13/9: ingen rotationsnotis i STATUS, TAVLA eller DECISIONS. Oförändrat.
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
- [ ] 🗄️ **#83 GALLRING av weather_observations — måste finnas FÖRE första kalla veckan**
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

*↩︎ = ÅTERSTÄLLT 10/9. Korten nedan föll av tavlan 8/9 20:43 (commit 99473c7: Claudes tavelsynk av
"Axels nästa steg" svalde 174 rader, inkl. tre Claude-sektioner). Inget av dem har bevis på klart sedan dess.*
- [ ] ↩︎ **Live Activity — varningskortet i Dynamic Island och på låsskärmen** (Axel 31/8: "ska den
  ligga över Maps?"). Ingen app får rita över en annan; Live Activity är det Apple tillåter:
  gul rad "Vakten på · 42 min" under körning, blossar upp "▲ Halt väglag · 2,0 km" när rösten
  talar, synlig över kartan och på låst skärm. Bannern (#23) kvar som textvariant. DECISIONS #38.
- [ ] ↩︎ **Startknapp på låsskärmen + i Kontrollcenter + åtgärdsknappen** — widget (iOS 17),
  Control (iOS 18), och en rad i guiden om Åtgärdsknapp → Genväg → Starta vakten (iPhone 15
  Pro+). Ett tryck, ingen Genvägar. DECISIONS #39.
- [ ] ↩︎ **Guiden med bilder + film** — skärmbild per steg (ringad knapp) inbakade i appen;
  15 s film per spår på kartsajten. Råmaterial: Axels inspelningar 31/8 (Inte alls), Bengt
  filmar CarPlay-spåret.
- [ ] ↩︎ **Introduktionen** (iOS) — bevis saknas: radera appen → installera → intron ska komma
  först; "Visa igen" i Inställningar. Introduktionen i Claude Design är enda skärmen som inte
  ritats om än. Android-spegeln (DECISIONS #36) efter att iOS-varianten testats.
- [ ] ↩︎ **#23 heads-up** — bannern över kartappen, båda plattformarna. (#22 T3–T7 i bilen och
  #24-resten står under Claude — låst, Android-listan.)
- [ ] ↩︎ Skinnet v3 på Android — del 1+2 committade 2/9 (5829d29, ee72f22: Theme.kt, fonter,
  fem ikoner, två flikar). Bevis på telefon saknas; bockas när Axel sett det.

### Axel — därefter
- [ ] **Tolv testare till Play-perioden** — Axels åtagande 31/8: "hittar dem utan problem".
  Väntelisterutan på kartan borttagen på hans beslut. Kvar i `docs/REKRYTERING.md` om det behövs.
- [ ] Domänen halkvakt.se (vilande beslut)
- [ ] Fysisk Android-testenhet (pappas telefon? begagnad?)

### Bengt
- [ ] 🧩 **#159 INTEGRATIONSKARTAN — tre av våra egna regler står i vägen för produkten**
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
  modellerad. Bokstavligt tolkad förbjuder regeln produkten.
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
- [ ] 📍 **#158 SKUGGLOGGENS LARM SAKNAR POSITION — och tre mätningar hänger på det**
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
- [ ] 📷 **#157 KAMERAFACIT ÄR TOMT — noll objekt efter 5 657 skuggkörningar**
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
- [ ] 🧵 **#155 SNUBBELTRÅD: ändras #83:s kvarhållning måste #89 och #98 byta byggform**
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
- [ ] 🔤 **#156 HALKORDEN FINNS I TRE OLIKA VERSIONER — upptäckt 14/9 av en ny kontraktsgrind**
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
  refaktorering vore risk utan vinst (jfr #126, då en deploy tyst tog bort check 7).
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
- [ ] 📮 **#154 ANMÄL NIO TRASIGA BYVINDGIVARE TILL TRAFIKVERKET — skriven och klar, skickas av Bengt**
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
  💡 **Varför det är värt att skicka:** vi har uteslutit stationerna ur vårt eget underlag, så vi är
  inte blockerade. Men felet ligger kvar för alla andra som läser samma öppna data — och svaret
  (givare, överföring eller aggregering?) avgör om konsumenter kan filtrera bort det själva.
- [ ] ⚖️ **#153 SAMMANVÄGT ALLVAR + ETT SMALARE UNDANTAG — två beslut som är BENGTS, inte byggbara förrän vintern**
  **Varifrån kortet kommer:** Bengts fråga 13/9, ordagrant: *"vi håller på att bygga ett antal olika
  risker som ska definiera och förutsäga vägförhållanden framöver men de ska inte kunna kombineras
  för att meddela trafikanten om den sammanlagda risken utan bara den största risken. Enligt dej är
  det rätt väg att gå?"* — och dessförinnan: *"om radarn signalerar blött och offset signalerar under
  noll, kommer motorn att generera en isrisk framöver?"* Svaret på den andra var **nej**, och det
  gjorde den första till en riktig invändning i stället för ett missförstånd.
  **TVÅ REGLER HADE TRASSLAT IHOP SIG, och de har olika skäl:**
  · **Regel 1 — en röst i taget.** `engine.ts` rad 120–129: *"priority selects the single winner;
  everything else is dropped"* och *"hard global throttle. Winner inside the window is dropped, not
  queued."* Det är MÄNNISKOFAKTORER, inte modellering — man kan inte säga tre saker på 45 sekunder
  till någon i 90 km/h. Regeln är rätt och ska inte röras.
  · **Regel 2 — en modellerad storhet får aldrig vara en avtryckare** (TROSKLAR-FRYSKLASSNINGEN §1,
  samma regel som SMHI-förstärkaren #95 d fick). Skyddar mot varningar som inte kan motbevisas av en
  mätning. Rätt i princip.
  **BESLUT 1 — SAMMANVÄGT ALLVARSMÅTT.** Motorn kan i dag säga VAD faran är men inte HUR ILLA det är:
  prioriteten är en fast ordning mellan SLAG, inte ett mått på allvar. Ett segment som är halt OCH har
  isrisk OCH kraftigt regn låter exakt likadant som ett som bara är halt. Förslaget är att
  kombinationen ändrar **den enda varning vi säger** — ordval, framförhållning eller prioritet — i
  stället för att lägga till en andra. *"Halka framöver"* mot *"kraftig halkrisk, flera tecken".*
  Det bryter ingen av de två reglerna, och det uttrycker precis den sammanlagda risk Bengt efterlyste.
  🔒 Kräver eget tröskeldokument med svep skrivna före mätning, och skuggsteg före röst.
  **BESLUT 2 — ETT SMALARE UNDANTAG I §1.** Min tillämpning av regel 2 är trubbigare än verkligheten,
  och det erkänns här: **(a) radarn är ingen modell** utan en mätning av nederbörd, kalibrerad med
  faktorn 0,65 (#153/#154) — i kombinationen blött+kallt är alltså bara ena halvan modellerad; **(b)
  interpolation mellan två mätningar är inte extrapolation från en.** Ligger vägen mellan en station
  som mäter −3 °C och en som mäter −2 °C är *"här är det under noll"* inramat av två eniga mätningar.
  Grind A:s egna tal säger samma sak: i bandet **0–7 km är MAE 0,33 °C och de grova felen 0,0 %**
  (DECISIONS #131) — modellen är utmärkt nära och dålig långt bort, och §1 gör ingen skillnad på de två.
  Förslaget: en modellerad temperatur får bära en avtryckare **ENDAST** när punkten ligger inramad
  mellan mätande stationer inom kort avstånd som är **eniga om tecknet**. Egna trösklar, eget skuggsteg.
  ⚠️ **Det kräver att Bengt ändrar ett dokument han själv fastställde 12/9.** §8 tillåter det fram till
  första skuggkörningen — men det ska göras som ett BESLUT, inte som en glidning när talen ser bra ut.
  **VARFÖR KORTET INTE KAN ARBETAS PÅ NU:** båda vilar på vinterdata. K-A står på ⊘ INGEN DOM med
  **noll** uppmätta frysfall (DECISIONS #137), och Finland har det inte heller — mätt 13/9: 133
  "frysrader" som alla är exakt 0,0 från EN station, alltså en fastnaglad givare och inte frost.
  Grind A:s A2-rad är OAVGJORT och kan inte avgöras på septemberdata.
  ⏭️ **STÄLLS TILL BENGT.** Inget byggs på det här kortet förrän vintern gett data. Det som ska göras
  NU är ingenting — kortet finns för att frågan inte ska tappas bort, och för att den ska vara rätt
  formulerad den dagen mätningarna kan svara på den.
- [ ] 🤝 **#94 Samarbeten vi inte prövat: ~~försäkringsbolag~~, åkerier, NTF/M Sverige** (ur Claudes
  systemanalys 10/9). 🛑 **FÖRSÄKRINGSSPÅRET STÄNGT 11/9 av Bengt (DECISIONS #94):** "det är klarlagt
  att vi inte kan få det samarbetet". Kortet bär det därmed varken som facitkälla eller som första
  spår. Konsekvens: skadedata är inte längre en väg till facit — grind T-B (#88) och tystnadsfelet
  (#98) döms mot vår EGEN facitstack (kamerafacit #20, road_condition_history, situation_archive #33),
  och betalningsviljan får sökas i de spår som lever. Drive-analysens §2.7 "försäkringsbolag först,
  de har facit" är därmed överspelad; tavlan gäller.
  **KVAR, i ny ordning:** (1) Åkerier och bussbolag kör samma sträckor varje dag — perfekta testbilar
  OCH B2B-marknad (kopplar till #92 fordonstyp och #90 sidvind). Nu första spåret. (2) NTF och
  M Sverige som kanaler till landsvägsföraren i mörker. Verify: ett möte bokat per kvarvarande spår.
- [x] ⛔ **#93 Kommunala vägar — STÄNGT 12/9, men HALVA KORTET FLYTTADES** (Bengts order när §2.6 togs ur
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

- [ ] ↩︎ **Kameravarningen i fel riktning — BEVISET SAKNAS ÄN** (återställt 10/9, föll av 8/9). Koden
  är bevisat rätt i alla tre motorerna (#55 tolerans 100°→60°, #57 riktningen vänd 180°, #59
  Öjersjö ID 14102020; 0.3.5 (8) första bygget med grönt kontrakt). Kvar: Bengt kör 0.3.5 och
  noterar KLOCKSLAG + PLATS per larm och per kamera utan larm. Beskrivningar räcker inte, vi har
  gissat tre gånger.
- [ ] ↩︎ Välkomsttext + testinstruktion till kompisarna (extern TestFlight-grupp = Beta App Review).
- [x] ↩︎ ~~Bodenresan 1/9~~ ✅ GENOMFÖRD — gav DECISIONS #53 (resan håller över pauser) och #55
  (kameratoleransen). Jämförelsen "Bengts logg bredvid testbilarnas rapport" gjordes aldrig;
  facit-frågan bor i #16/#38b.

### Claude — olåst
- [ ] 🕳️ **#154 STEG C:s REGNFÄLT NÅR INTE DE SEGMENT VATTENPLANINGEN SITTER PÅ** (fynd i
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
- [ ] 💸 **#152 KASSAVAKTEN — check 8 i vakthunden: larmar innan Actions-taket slår i** (Bengts order
  13/9: "Kan man ha någon mätning på taket så man vet när man närmar sig gränsen. Automatisk alltså").
  💰 **RÄTTAD 13/9 (DECISIONS #160, Bengts order "gör kort 152 nu"):** prognosen räknade på
  månad-till-datum, och i det snittet låg fem flöden som lades ner 8–9/9 (`ingest-fi`, `-no`,
  `-dk`, `publish-map`, `regn-30`). Vakten sa **21 september**; uppmätt verklig takt var
  **232 min/dygn** senaste dygnet och **180** de två senaste, mot snittets 311 — och driften ensam
  (ingest + grannar + healthcheck) är **81**, resten är bygge. **Förbrukningen läses nu ur
  månadstalet, prognosen ur en SLÄPANDE takt** över de två senaste kompletta dygnen; taket flyttas
  därmed till **26 september** på verkliga tal. Båda talen står i varje larm — månadssnittet låser
  fast en takt som kan ha upphört, det släpande är känsligt för en byggskur — och avviker de mer än
  25 % säger larmet **TAKTEN ÄNDRAS**. Kostar noll extra API-anrop: dygnsloopen fanns redan.
  🔨 BYGGD 13/9, väntar på deploy + bevis. Bakgrunden är 5/9: minuterna tog slut mitt i drift, appen
  serverade 66 h gammal data, och det upptäcktes bara för att en människa råkade titta. Taket har HÅRT
  STOPP, så det är en vägg och inte en försämring. Ligger i vakthunden (Supabase, noll Actions-minuter)
  med samma nyckel som mätvakten redan använder för att läsa Actions-API:t.
  RÄKNINGEN: körningar sedan den 1:a, avrundade uppåt per körning, minus gratispotten 2 000 min,
  gånger 0,008 USD. Larmar när (a) faktisk förbrukning passerat 70 % av taket, eller (b) prognosen når
  taket före månadsskiftet — och det är (b) som är poängen: "i dagens takt slår taket i den 25:e" går
  att agera på, "62 % förbrukat" gör det inte.
  TVÅ KÄNDA FEL, utskrivna i varje larm i stället för dolda: taket är KONTOOMFATTANDE men vi ser ett
  repo, och GitHub avrundar per jobb medan vi avrundar per körning (android.yml har två jobb). Talet är
  därför ett GOLV, aldrig fakturan. Exakta siffran kräver kontobehörighet ⇒ Axels handgrepp, eget kort
  om vi vill ha den.
  KÖRS 05/11/17/23 UTC, inte varje timme: en räkning är ~30 API-anrop och budgeten rör sig 1–2 USD/dygn.
  FÄRGAR ALDRIG DRIFTVAKTHUNDEN RÖD (egen etikett `kassavakt`, egen öppna/uppdatera/stäng-cykel) — samma
  regel som mätvakten: rött ska betyda "kedjan till appen är bruten NU".
  ✅ ARITMETIKEN BEVISAD fristående mot sex handräknade fall (husets konvention för vakthundslogik, som
  kadensTimmar): gratispotten ej förbrukad ⇒ 0 USD; 6 375 min ⇒ exakt 35,00; 202 min/dygn ⇒ taket nås
  INTE i september; 261 min/dygn ⇒ taket slår i 25/9; noll minuter ⇒ inget datum; första halvtimmen i
  månaden ⇒ ändlig takt. Testet checkades medvetet INTE in: det hade blivit en andra kopia av tre
  trösklar och utlöst kontraktsgrinden för noll nytta — konstanterna finns i EN fil.
  Verify: deploy-supabase grön, sedan `?kassaprov=1` ⇒ issue med etiketten `kassavakt` som stängs av
  nästa körning under gränsen. Och en riktig kassarad i nästa vakthundskörning 05/11/17/23.
  ✅ **KLAR OCH BEVISAD 13/9 02:08.** Deployad (vakthund, 705 kB) och larmvägen prövad skarpt med
  `?kassaprov=1` via DB-knappen ⇒ **issue #210 med etiketten `kassavakt`**. Den larmade på EGEN grund,
  inte bara på provraden: *"I dagens takt (311 min/dygn) slår taket i den 2026-09-21."*
  **FÖRSTA SKARPA MÄTNINGEN, och den är värre än fönsterskattningen:** 3 761 min sedan 1/9 över
  2 798 körningar ⇒ debiterat 1 761 min = **14,09 av 35 USD**, takt **311 min/dygn**, prognos för
  månaden **59 USD**. Fönstermätningen 12/9 gav 202 min/dygn — den fönstret var alltså lugnare än
  månadssnittet, och 31–40 USD var för lågt räknat.
  🩹 **TVÅ FEL AV MIG PÅ VÄGEN, båda bokförda för att de är lärorika:**
  · Jag dispatchade deploy-supabase UTAN `funktion` och fick standardvärdet `publicera`. Jobbet blev
    grönt, jag läste grönt som "rätt sak deployad", och första provet kunde inte fungera. Läxan är den
    gamla: en grön körning bevisar att NÅGOT gick bra, inte att det var det man tänkt.
  · Första skarpa körningen räknade exakt 1 000 körningar och rapporterade 94 min/dygn — halva
    sanningen, utan felmeddelande. `/actions/runs` paginerar bara till 1 000 träffar. Lagat: räkningen
    går ett dygn i taget, och dygnsloopen är självtestad. Läxa i CLAUDE.md.
  · (Ett tredje, ofarligt: `kassaprov` lades i skriptets vitlista men inte i dbknapp.yml:s if-sats, så
    en körning föll tyst i migrera-grenen och körde om gallringsmigrationen. Idempotent, inga rader
    rörda, bevisraderna visade alla tio cron-jobb intakta. Villkoret är nu inverterat så att det bara
    finns EN lista. Läxa i CLAUDE.md.)
- [ ] 🧊 **#151 VÄGLAGETS ÅLDER — ska en stående vinterklassning tystas när mätningarna säger att vintern tagit slut?**
  📄 **TRÖSKELDOKUMENT FASTSTÄLLT 12/9 av Bengt** (`docs/TROSKLAR-VAGLAGETS-ALDER.md`, DECISIONS #151/#152).
  **Kortet kommer ur att Axel mätte i stället för att bygga det jag antog.** Jag flaggade att
  `road_conditions` saknar väderpunkternas tretimmarsgräns; Axel mätte och upphävde antagandet:
  818 segment, alla kod 1, **exponering noll i september**, senaste ändring 25/8, **inget segment
  har end_time**. Operatören skriver bara vid FÖRÄNDRING — alltså kan en gammal klassning vara sann,
  och en hård åldersgräns skulle tysta en halkvarning på en väg som varit hal i tre dygn. Precis det
  fel dämpningen (#100) fälldes för.
  **Frågan är omformulerad:** inte *"är klassningen gammal?"* utan *"motsäger världen den?"*.
  Ålder är på sin höjd en förstärkning, aldrig en grund.
  **Tre regler i §3:** R0 ingen regel (förvalet) · R1 ytan motsäger · R2 ytan motsäger + ålder ·
  **R3 hård åldersgräns FÖRKASTAD före mätning** — felet ligger i formen, inte i tröskeln, och
  skälet står skrivet så att nästa förslag möts av det.
  **Nollan är ett utsagolöst noll** (#71): arkivet har inga vinterord alls i september, så mätningen
  KAN inte falsifiera. Körs om vid första vinterklassningen — med `kodgrinden` avsnitt D, som redan
  mäter exakt den frågan.
  **Taket är hårdare än vanligt och skälet står i §5:** alla andra tröskeldokument reglerar när vi
  får SÄGA något. Det här reglerar när vi får TIGA, och ett fel åt det hållet syns inte i en logg —
  det syns i att en förare inte fick veta. E3 (tysta utan skuggkörning) = **aldrig**.
  ⏭️ **Väntar på VINTERN.** Inget mäts förrän arkivet fått vinterklassningar — körs Å-A i september
  blir svaret OAVGJORT på Å-A4:s krav om 100 fall, och det är rätt svar, inte ett misslyckande.
  Fram till första skuggkörningen får §4:s svep och §5:s krav justeras med en rad i DECISIONS;
  därefter inte alls.
  🔧 **Axels två, utanför det här kortet:** `end_time`-filtret på segmenten (en rad — kolumnen finns
  i sql/001:24 och ingesten skriver den redan, men den är OPRÖVAD tills TRV satt en EndTime en gång)
  och stillaståendevakten (återanvänd mätvaktens 6b-form: larma inte på tystnad, larma på tystnad
  MEDAN stationerna säger vinter — och "alla 848 stationer" inträffar aldrig).
- [ ] 🗑️ **#146 27,6 MB SWIFT-BYGGUTDATA LIGGER SPÅRAT I REPOT — beslut krävs innan något tas bort**
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
- [ ] 🧊 **#103 FRYSKLASSNINGEN — kan en modell som är opålitlig på grader ändå bära en klass?**
  📄 **TRÖSKELDOKUMENT SKRIVET 12/9** (`docs/TROSKLAR-FRYSKLASSNINGEN.md`, **FASTSTÄLLT 12/9**, DECISIONS #130/#135).
  **Frågan är Axels, ordagrant**, ur hans bedömning av grind A: grind A föll, men A3
  frysklassningsfelet klarade med **1,1 % mot ett krav på 10** — modellen är dålig på GRADER men
  nästan aldrig fel om VILKEN SIDA AV NOLL, och det är den fråga motorn faktiskt ställer.
  ⚖️ **Legitim, inte en efterhandsräddning** — hans egen formulering: *samma data, ny fråga, ärlig
  ordning*. Dokumentet är skrivet så att **inget tal i §2 eller §4 kommer ur A3:s utfall**, och det
  står uttryckligen att 1,1 % inte får åberopas som skäl för någon tröskel.
  🚧 **AVGRÄNSNINGEN SOM AVGÖR ALLT ANNAT:** en godkänd frysklassning ger INTE rätt att skapa en
  varning där motorn tiger. Den får bara stärka en bedömning som redan vilar på en uppmätt station.
  **En modellerad storhet får aldrig vara en avtryckare** — samma regel som #95 (d) fick.
  🎯 **K2 är dokumentets egentliga idé:** grind A tvingade modellen att svara i varje punkt. En
  klassificerare får AVSTÅ nära gränsen — frågan blir hur bra den är på det den uttalar sig om, och
  hur mycket den då måste avstå. Därför har K-A både träffsäkerhets- OCH täckningskrav.
  ⚠️ **K-A2 är asymmetrisk med flit och undantagen från all lättnad:** att säga "fryser" om en torr
  väg kostar ett onödigt larm, att säga "fryser inte" om en isig väg kostar löftet produkten vilar
  på. Taket för det felet är tio gånger hårdare (≤ 1 % mot ≥ 95 %).
  🍂 **Vakt mot september:** K-A4 kräver ≥ 100 punkter med UPPMÄTT frys. Annars kan ett
  septemberunderlag ge 99 % rätt klass genom att alltid svara "fryser inte".
  ✅ **FASTSTÄLLT 12/9 av Bengt** (DECISIONS #135). Svepet och kraven är låsta.
  ➡️ **NÄSTA: K-A på befintligt arkiv** — kräver ingen ny data och ingen frost.
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
- [ ] 🪢 **#95 Plan B för Trafikverket-beroendet — mät SMHI som reserv** (systemanalys 10/9). Allt
  🔓 **BLOCKERARFYNDET 12/9 (DECISIONS #114): kortet blockerar #88:s dom.** T-A:s fysikkontroll
  kräver "vanligast klara nätter", och molnmängd finns inte i arkivet. #95 är alltså inte en
  förstärkare som kan vänta till våren — den står i vägen för den enda punkten med naturens deadline.
  💰 **MEN MOLNET BEHÖVER INTE ARKIVERAS, och det river kortets dyraste rad.** SMHI metobs
  **parameter 16** (total molnmängd, timvärde) har `latest-months` som räcker **130 dygn bakåt**,
  plus `corrected-archive`. Molnet hämtas I EFTERHAND vid körning, som smhi-prov redan gör med
  lufttemperaturen. Ingen tabell, ingen ingest, noll lagring. Kortets "+25 MB/mån och oktoberbeslutet
  fem dagar närmare" gäller ANKARROLLEN, inte molnet.
  📐 **TÄCKNINGEN MÄTT** (`scripts/smhi-tackning.ts` + knapp, körning 34676483898): bara 108 av 459
  SMHI-stationer rapporterar molnmängd, men **91 % av VViS-stationerna och 94 % av vägsegmenten har
  en molnobservation inom 50 km** (median 29 km). Molnet är en STORSKALIG storhet — ett molntäcke
  sträcker sig tiotals mil — så 50 km är en helt annan sak här än för en yttemperatur. Hur långt det
  FÅR sträckas är dock inte mätt, bara hur långt det MÅSTE.
  ✅ **BLOCKERINGEN LYFT 12/9** (PR #163, DECISIONS #115): hämtningen är inkopplad i
  `scripts/grind-t-a.ts` och fysikkontrollen kör båda halvorna. Första utfallet: klara nätter 29 %
  fyrning mot mulna 0 %. **Sentinelfynd i formatet:** enheten heter procent men värdena är octas
  omräknade, och **113 % är inte molnmängd utan SMHI:s kod för HIMLEN SKYMD** — fysikaliskt
  motsatsen till klar natt. Klassas som skymd, räknas med de mulna.
  ➡️ ~~**KVAR AV #95:** ankarrollen (SMHI som extra ankare i grind A)~~ ⛔ **ANKARROLLEN BESVARAD
  12/9 — OCH SVARET ÄR NEJ** (DECISIONS #119, smhi-prov omkört på 60 dygn). På 1 918 jämförbara
  punkter: bas 1,05 °C → **+SMHI 1,20 °C, sämre i varje band**. Verify 3 ("sjunker MAE i banden över
  15 km?") är därmed besvarad negativt: den STIGER (1,02 → 1,35 i > 20 km). SMHI duger inte som
  förtätning där VViS finns. Kvar av reservtanken är bara det ursprungliga fallet: vad vi har när
  Trafikverket tystnar HELT — och där är priset uppmätt till 2,36 °C på de 352 punkter som bara
  finns tack vare SMHI.
  📐 **VERIFY 1 SKILD FRÅN MOLNFRÅGAN 12/9** (DECISIONS #118): molnkörningen svarade på
  representativitetsradien (50 km, 108 stationer) men lämnade §2.8:s EGEN Verify 1 obesvarad — "hur
  många av de 818 segmenten får en SMHI-station inom **15 km**", alltså luftens 235 stationer.
  `scripts/smhi-tackning.ts` mäter nu båda och håller isär dem i utskriften.
  📊 **VERIFY 1 — SVARET 12/9 (DECISIONS #120): 331 av 818 segment (40 %) har en SMHI-luftstation
  inom 15 km.** Median 17 km, 88 % inom 30 km, 100 % inom 50 km; 235 aktiva luftstationer av 1 003 i
  registret. **Vid den gräns §2.8 själv satte räcker täckningen alltså inte.** Var gränsen FÅR ligga
  är inte mätt — det är Verify 2, och den har redan fått ett svagt förhandsbesked samma kväll
  (SMHI-ankaret försämrar modellen, 2,36 °C på de punkter som bara SMHI ger).
  ➡️ **KVAR AV #95:** Verify 2 (luft→yta-korrelationen vintertid — den enda som kan avgöra reserven),
  representativitetsradien (hur långt molnet FÅR sträckas) och SMHI-förstärkaren nedan. Ingetdera
  blockerar längre något.
  🔨 **(d) FÖRSTÄRKAREN BYGGD 12/9 kväll** (Bengts "vi bygger smhi förstärkaren", DECISIONS #121).
  📄 `docs/TROSKLAR-SMHI-FORSTARKAREN.md` — ✅ **FASTSTÄLLT 12/9 av Bengt** (DECISIONS #135).
  ⚖️ **SPÄNNINGEN I KORTET LÖST FÖRE SVEPET:** "yta nära noll" är BREDARE än motorns `yta ≤ 1 °C
  OCH fukt`, men kortet förbjuder uttryckligen att regeln skapar en varning. Därför får parametern
  F3 ett **tak vid motorns egen tröskel** — regeln får skära bort, aldrig lägga till.
  ✅ **AVGJORT AV BENGT 12/9: DEN SMALA** (DECISIONS #123). Skälet som fällde den breda: **ett län är
  ingen punkt och ingen sträcka.** Snöar det verkligen över länet rapporterar de flesta stationerna
  där redan nederbörd och motorn varnar; de som är TORRA under en aktiv länsvarning är just de där
  varningen är lokalt fel — alltså exakt falsklarmen. Och hålet ägs redan av ett bättre kort:
  **#89 (a) gör samma sak med en PUNKTKÄLLA** (stationens egen regnhistorik, 76 % av regnstoppen).
  Den breda förstärkaren var inte en bättre förstärkare, den var en sämre #89 (a).
  ➡️ **DEN BREDA IDÉNS KÄRNA FLYTTAD TILL #89, inte slängd:** ny parameter **`N_varning`** i
  TROSKLAR-OVERGANGAR §2.3 — en aktiv vintervarning **förlänger N** (hur länge efter uppmätt regn
  frysrisken lever vidare) utan att uppfinna väta ur en polygon. Utlösaren förblir stationens eget
  uppmätta regn. Svep av · 2 · 4 · 6 h, gatad med och utan i B3.
  🎚️ **MOTORN HAR INGET KONFIDENSFÄLT**, så effekten är namngiven: **E0 skuggkolumn (startläget)**
  · E1 längre försprång (samma form som #90:s roll B) · E2 annan text (Axels) · **E3 högre
  prioritet ALDRIG** — det skulle tysta en olycka.
  🕳️ **FYNDET UNDER BYGGET, dyrare än regeln själv: arkivet saknade varningens GILTIGHETSFÖNSTER.**
  `smhi_warnings` bär `approx_start`/`approx_end`, men töms vid varje synk; historiken har sedan
  `001_init` burit allt utom just de två fälten. Arkivet visste **när en varning publicerades, inte
  när den gällde** — och SMHI publicerar i förväg (publicerad 14, gäller 22–06). **Går inte att laga
  i efterhand.** ✅ `sql/015_smhi_giltighet.sql` + automigrationen i `ingest/db.ts` + historik-
  skrivningen bär fälten framåt. Varje dygn utan den migrationen hade varit ett dygn vinterunderlag
  som aldrig kan lagas — samma logik som T-A:s frostnätter.
  🚪 **GRIND F-A HAR BÅDE GOLV OCH TAK:** ≥ 200 förstärkta stationstimmar, ≥ 20 områden, andelen
  **mellan 5 % och 80 %**, inget område över 25 %. Över taket säger regeln bara "det är vinter".
  ⚠️ **Ett län är inte en väg** — varningsområdena är länspolygoner, så stor träffyta är inget bevis.
  🔬 `scripts/smhi-forstarkaren-steg0.ts` + knapp. F-B är en VINTERGRIND: facit
  (`road_condition_history`) står stilla sedan 25/8 och kan inte döma i september.
  ⊘ **FÖRSTA KÖRNINGEN 12/9: OAVGJORT, som väntat** (DECISIONS #122). 126 historikrader, 41 områden,
  geom i 97,6 %, **giltighetsfönster i 0,0 %** (alla skrivna före sql/015). Bara **3 kvalificerande
  stationstimmar** på 30 dygn, och **0 förstärkta i alla nio F1 × F2-rutor**. Varningstyperna:
  WIND_SEA 85 · FIRE 25 · WATER_SHORTAGE 10 · RAIN 3 · FLOODING 3 — **noll SNOW_ICE, noll ICING.**
  🐟 **BIFYND: `isWinterRelevant()` räknar kuling till havs som vinter.** Ingestens regex matchar
  `WIND`, och därmed `WIND_SEA`. Ofarligt i drift (flaggan används bara i en loggrad, inget
  filtreras på den) men loggraden "winter-relevant: N" betyder inte vad den ser ut att betyda.
  Vakten i skriptet räknar nu per kodmängd i stället för ett enda tal.
  🧱 **BIFYND 2: en migration i automigrationslistan är inte en körd migration.** Första försöket
  föll på `column "approx_start" does not exist` — `sql/015` körs först när INGESTEN kör, och
  mätskriptet kördes emellan. Samma form som "en ändrad fil under supabase/functions/ är INTE en
  deploy". **Regel: efter en migration som ett mätskript beror på, tryck dbknappen i samma varv.**
  ➕ **ÖVERTAGET FRÅN #93 den 12/9 (DECISIONS #108): SMHI-FÖRSTÄRKAREN.** `smhi_warnings` hämtas
  redan och ligger i arkivet (tiotals kB/dygn), så regeln **snöfallsvarning + yta nära noll = högre
  konfidens** kostar 0 kr och kräver ingen ny källa. Förstärkare av frysrisken, ALDRIG en egen fara
  — den får höja konfidensen i en varning som redan kvalificerar, inte skapa en varning. Verify:
  skuggkolumn `smhi_forstarkt` mätt mot facit en vintermånad. Detta är den billigaste delen av hela
  #95 och kan göras före täckningstabellen.
  hänger på ETT API (WeatherMeasurepoint). Givarvakten fångar trasiga sensorer, inte ett flöde som byter
  schema eller stänger; FI/NO/DK ger ingen redundans i Sverige. SMHI metobs (lufttemp, daggpunkt, moln,
  sikt, vind — GOLVET §7) har provats (smhi-prov) men aldrig mätts som RESERV: hur många av de 818
  segmenten får en SMHI-station inom 15 km, och hur väl följer SMHI:s lufttemp VViS-ytan vintertid?
  Ren mätning ur arkivet + smhi-provet, ingen ny hämtning i drift. Verify: en tabell segment ×
  närmaste SMHI-station (avstånd, täckning %) och en korrelationsrad luft→yta ur en kall vecka.
  🧩 **BREDDAT 10/9 (Bengt: "inte bara backup — en pusselbit för 3 km längre fram"):** SMHI mäter
  inte ytan, men mäter det som avgör hur långt en VViS-yta får sträckas ut: (a) MOLNMÄNGD — klar
  natt ger stor lokal spridning (dalgångar 3–5 °C kallare), mulet/blåsigt gör stationen representativ
  milen runt; VViS saknar molnmängd helt (GOLVET §7). (b) VIND + DAGGPUNKT som andra givare på
  utstrålningen. (c) FÖRTÄTNING — SMHI:s automatstationer som extra ankare i offsetmodellen där VViS
  är glest (inlandet), med egen luft→yta-överföring per station. (d) NEDERBÖRDSTYP/-mängd per timme
  till #89:s övergångar. Den bild vi vill ha men inte kan mäta — ytan 3 km fram — blir då ett lager:
  närmaste VViS-ankare (#38b) × representativitetsradie ur moln/vind (SMHI) × terrängkorrektion (#91)
  × trend (#88), märkt MODELLERAT, sagt som risk, dömt i mars mot grind A/B/C. "Okänt" förblir ett
  giltigt svar. Verify (utöver ovan): grind A körd med SMHI-ankare inlagda — sjunker MAE i bandet
  15–20 km och >20 km? Och: felet i leave-one-out som funktion av SMHI-molnmängd (klar/halvklar/
  mulet) — är spridningen 2× större klara nätter? Om ja är molnmängden representativitetsknappen
  TROSKLAR-SKUGGAN:s trenivåmärkning saknar. FORTFARANDE OSYNLIGT oavsett SMHI: en snöby mellan
  stationerna (bara radarn, #43) och om saltbilen passerat (ingen öppen källa, RISKKARTA-BENGT).
  Blir svaret ja på molnfrågan är SMHI inte en reserv utan en del av motorn — då skrivs kortet om
  till ett byggkort med tröskelrad i TROSKLAR-SKUGGAN (§5, båda signerar). Resonemanget i sin helhet:
  Drive, "Framtida utvecklingsmöjligheter — systemanalys varningssystemen 2026-09-10 v2 (läsbar)", §2.8.
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
   Vakthunden larmar via issue utan en enda Actions-minut (#73). Egen etikett `vinterord`, egen issue,
   ENGÅNGSLARM (letas i state=all). Det är en HÄNDELSE, inte ett fel — den färgar aldrig vakthunden röd.
   Faller larmvägen hamnar DET i problem[], för ett vinterord som passerar obemärkt är just vad kortet
   ska förhindra. Issuens kropp bryter ner förekomsterna per kod, så det syns direkt om ett farlighetsord
   står på kod 1 (⇒ nivådelningen faller, regional gräns blir alternativet). Prov: `?vinterprov=1`, egen
   etikett så provet inte förbrukar engångslarmet; båda etiketterna skapade i förväg (läxan från #73:s
   första larmprov som gav 500). **BEVIS, inte deploy-kvittot:** vakthundens larmprov 04:53 (issue #109)
   visar raden `vinterord i väglagsarkivet: nej` bland mätvärdena — nya koden kör skarpt i Supabase.
   ⚠️ INTE samma sak som marknadsföringens `snolarm`, som fyrar på `code !== 1` ur CDN-snapshoten
   (säsongens första verkliga halka per län, ett säljtillfälle). Det här läser ARKIVET oavsett kod, och
   den intressanta cellen för #52 är kod 1 — den som snölarmet per konstruktion hoppar över.
   ✅ **VINTERPROVET KÖRT 11/9 05:02 — LARMVÄGEN BEVISAD FÖRE SNÖN** (Bengts "kör vinterprovet",
   PR #111). Larmet fyrar EN gång per säsong; ett larm som aldrig fyrat är inte bevisat, och #73:s
   första larmprov gav 500 i stället för larm. Här hade ingen kunnat prova förrän snön kom, och då
   är signalen redan förbrukad. DB-knappen fick därför flaggan `vinterprov` (vitlistad, läggs på
   vakthundens EGET cron-kommando — nyckeln passerar aldrig en logg; vitlistan ligger FÖRE
   databasfrågan så en felstavning faller på en rad och går att prova utan DATABASE_URL).
   **UTFALL:** issue #112 skapad med etiketten `vinterord-prov`, det riktiga engångslarmet
   `vinterord` ORÖRT (noll issues) — provet förbrukade det alltså inte. Tabellraden visade
   "(inga rader; detta är ett prov)", som den ska när arkivet saknar vinterord. #112 stängd.
   BONUSBEVIS i samma varv: larmprovets issue #109 stängdes automatiskt 05:00 av nästa gröna
   timkörning ("Stänger — allt grönt igen"), så även STÄNGvägen är bevisad, inte bara öppnandet.
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
  📄 **TRÖSKELDOKUMENT SKRIVET 12/9** (`docs/TROSKLAR-RIMFROST.md`, **FASTSTÄLLT 12/9**, DECISIONS #117/#135).
  Skälet: #89:s överlämning nedan pekade på "#46:s eget tröskeldokument" — som inte fanns. En
  överlämning till ett dokument som inte finns är en tappad idé med kvitto (samma form som den
  dinglande TROSKLAR-TYSTNADSFEL 11/9). **Formen avgjord före svepet:** rimfrosten blir en ANDRA
  GREN i `icing_point`, inte en sjätte farotyp — en sjätte kind skulle röra varje vektor och hela
  prioritetsstegen. Fyra grindar R-A…R-D, sex osatta parametrar med svep, och en givarvakt som är
  **undantagen från all lättnad** (får skärpas, aldrig mjukas upp) med kortets egna tal som skäl:
  53 av 58 kandidater från TRE stationer, 0 av 53 överlevde äkthetsvillkoret. R-A5 gör läxan till
  ett krav: ingen station får stå för mer än 20 % av träffarna. **Billigaste vägen till underlag är
  det FINSKA arkivet** — KASTEPISTE sedan 4/9, Lapplands septemberfrost ger äkta rimfrostnätter
  veckor före Sverige, och den körningen kräver ingen svensk frost och ingen dom.
  ✅ **FASTSTÄLLT 12/9 av Bengt** (DECISIONS #135). Svepet och kraven är låsta.
  📥 **ÖVERLÄMNAT FRÅN #89 den 12/9** (TROSKLAR-OVERGANGAR §6, DECISIONS #109). Två saker ska in i
  #46:s eget tröskeldokument. **(1) Dimma är en ÖVERGÅNGSORSAK, inte en interaktion:** dimma är luft
  vid ~100 % RH, alltså daggpunkt ≈ lufttemperatur, så kondensationsvillkoret (yta ≤ daggpunkt) blir
  uppfyllt så fort ytan är kallare än luften. Sikt < X m hör därför hemma som **konfidenshöjare för
  kondensationsvillkoret** — ingen egen fara, ingen egen prioritet. **(2) PARTITIONEN mot efterhalkan:**
  **#46 äger fallet när yta ≤ daggpunkt** (kondensation pågår), **#89 (a) när yta > daggpunkt men
  regn inom N h** (kvarvarande regnvatten fryser i torr luft). Utan den gränsen dubbelräknar
  tystnadsfelet samma miss.
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
- [ ] 🧭 ↩︎ **#38b Stråket / skuggmotorn — ÅTERSTÄLLT 10/9** (föll av tavlan 8/9 20:43 i commit
  99473c7; #88, #91 och #95 hänvisar hit). Bengts byggplan v3 (31/8): segmentmotorn i november, i
  strikt skugga, dom i mars. Sekvensering mot lanseringen = Axels beslut.
  - [x] ~~(1) Tröskeldokumentet~~ ✅ 1/9 (DECISIONS #52): docs/TROSKLAR-SKUGGAN.md, grind A/B/C.
  - [x] ~~(2) Ankarklippningen~~ ✅ 1/9 (DECISIONS #55): kamerorna ger ingen ny ankartäthet
    (738/744 står vid en VViS); Norrland 9,2 km / 12,6 % oförändrat. Knappen ankaranalys.yml.
  - [ ] **(3) Offsetmodellen mot arkivdata (grind A)** — publish/grind-a.ts, knappen grind-a,
    leave-one-out mot A1–A3, domspärr under 500 punkter/20 stationer, larmväg bevisad 1/9.
    Rökprov 1/9 (43 punkter): felet växer med ankaravståndet (0,63 °C 0–7 km → 5,39 °C >20 km).
    AUTOMATISK måndagar 05:40. 🔑 Skarp prövning på vinterdata (≥ 500 punkter) före november.
    🔴 **DOMEN HAR FALLIT 12/9 — OCH DEN ÄR ETT NEJ** (körning 06:51, 60 dygn, DECISIONS #119).
    Den 1/9 höll domspärren på 57 punkter ("INGEN DOM"). Nu **2 042 punkter**, 36 gånger fler, och
    vakten släpper: **A1 MAE 1,06 °C mot kravets 1,0 ⇒ FALLER. A2 grova fel 10,7 % mot 5 % ⇒
    FALLER. A3 frysklassfel 1,1 % mot 10 % ⇒ KLARAR med bred marginal.** Skriptets egen rad:
    *"GRIND A FALLEN — bygg ingen skugga (tre veckor sparade)."*
    🔄 **OMKÖRD 12/9 MED BÅDA VAKTERNA (DECISIONS #131, Bengts order + Axels ja): INGEN DOM.**
    Med #75:s givarvakt (#129) och marginalvakten: **A1 0,85 ± 0,05 mot 1,0 ⇒ KLARAR**,
    **A2 5,1 % ± 1,0 pe mot 5,0 % ⇒ OAVGJORT**, **A3 0,3 % ± 0,2 pe mot 10 % ⇒ KLARAR**.
    ⛔ **Det är INGET godkännande** — grinden öppnar bara på KLARAR, segmentmotorn får inte
    byggas. Men husets svar är nu "vi vet inte än" i stället för "nej".
    ✅ **ANOMALIN FINNS INTE LÄNGRE I TALEN:** 0,33 · 0,78 · 0,85 · 0,89 stiger monotont med
    ankaravståndet. Bandet som var sämst av alla fyra är nu näst bäst.
    ⏰ **OCH DÄR SITTER NOVEMBERBESLUTET:** A2 går inte att avgöra på septemberdata, och
    vinterdata kommer EFTER november. Valet står mellan att skjuta segmentmotorn till nästa
    vinter eller bygga på en modell som inte är klarerad. **Bengts och Axels.**
    ⚖️ **MARGINALVAKTEN INLAGD 12/9 kväll (DECISIONS #126/#127) — OCH A1 FÖLL ALDRIG.**
    Domspärren vaktade mängden underlag, inte marginalen. Med vakten: **A1 1,06 ± 0,09 °C mot
    tröskeln 1,0 ⇒ OAVGJORT** (intervallet omsluter tröskeln), **A2 10,7 % ± 1,3 pe mot 5,0 %
    ⇒ FALLER brett**, A3 1,1 % ± 0,4 pe mot 10 % ⇒ KLARAR brett. **Domen står — men den vilar
    på ETT mått, inte två.** Det skärper vad den säger: inte "modellen är i genomsnitt för
    dålig" (oavgjort) utan **"den går tillräckligt ofta tillräckligt fel"**. Läs om raden
    nedan i ljuset av det.
    ⚠️ **Tre saker som måste läsas med innan någon agerar:** (a) A1 faller på SEX HUNDRADELAR
    (1,06 mot 1,00) medan A2 faller med marginal — det är de grova felen som fäller, inte
    medelfelet. (b) Bandet **7–15 km är sämst av alla** (MAE 1,41 · 18,4 % grova), sämre än
    > 20 km — inte monotont i avstånd, och utan förklaring i dag. (c) Frysklassfelet klarar med
    1,1 %: modellen är nästan tillräcklig för det BESLUT den används till, men inte för den
    TEMPERATUR den rapporterar.
    🔬 **ANOMALIN MÄTT 12/9 kväll — OCH FÖRKLARAD** (`scripts/anomalin.ts` + knapp, Bengts order
    efter Axels bedömning, DECISIONS #125). **Grind A bär INTE #75:s givarvakt.** Frågesatsen tar
    varje rad med `surface_temp_c` utan att kräva rimlig yta−luft, och 61 % av arkivets frostrader
    faller på den vakten (#106). En trasig givare förstör både sin egen punkt och sina GRANNARS —
    och en granne på 10 km får hög vikt. **Med vakten på är anomalin borta:** 7–15 km går från
    1,41 / 18,4 % till **0,78 / 3,1 %**, och banden stiger monotont med avståndet
    (0,33 · 0,78 · 0,85 · 0,89) precis som fysiken förutsäger.
    ✅ **OCH DOMEN STÅR ÄNDÅ.** A1 skulle klara (0,85 mot 1,0). **A2 faller på en tiondels
    procentenhet: 5,1 % mot 5,0 %.** Därför lades en decimal till i utskriften innan något
    rapporterades — "5 %" dolde exakt den skillnaden. Ingen tröskel har rörts.
    ❌ **Min egen konfunderingshypotes är FALSIFIERAD:** inom Norrland ensamt är 7–15 km
    fortfarande värst (0,33 · **2,10** · 0,96 · 1,09). Anomalin är inte geografi.
    🏔️ **Axels terränghypotes träffar PLATSEN men inte FORMEN:** hela skadan ligger i cellen
    höjdskillnad 50–100 m (4,16 / 55,3 % på 47 punkter), men ≥ 100 m är välartad (0,59). Vore
    mekanismen "nära nog för vikt, långt nog för annan terräng" borde ≥ 100 m vara värst.
    ⚠️ **OCH EN KOMPLETTERING TILL AXELS VERIFIERING:** hans 302 stationer är det GEOMETRISKA
    bandet. Domen bärs av stationer som faktiskt gav en utvärderingspunkt, och där är talen
    **5 · 13 · 19 · 88**. **7–15 km-domen vilar på tretton stationer.** 629 av 761 stationer hade
    ingen enda vintertimme. Det ÄR ett urvalsfel — inte i geometrin han kontrollerade, utan i
    vilka stationer som blev kalla nog med en samobserverande granne.
    🕳️ **Bifynd värt ett eget kort:** mellersta Sverige (58,5–60,5°) bidrar med TOLV punkter
    totalt. Grind A:s dom vilar i praktiken på Norrland och Skåne.
    🔑 **ATT BESLUTA (Bengt + Axel):** ska grind A:s frågesats få #75:s vakt? Huset kallar den
    obligatorisk för varje väderfråga; grind A har den inte. Det är inte målstolpsflytt — men det
    ändrar talen, och därför är det inte Claudes beslut.
    🔑 **DOMEN ÄR BENGTS OCH AXELS, inte Claudes** — kortet står kvar
    som låst tills de läst talen. Frågan att avgöra: faller hela segmentmotorn, eller ska A2:s
    gräns prövas mot vad frysklassfelet faktiskt visar?
  - [ ] **(3b) Ankarbreddningen** (Bengts fråga 1/9: "vad krymper avståndet?") — rangordningen
    står: FELKARTAN DÖMER (behöver luckan lagas alls?), LUFTANKARNA LAGAR, HÖJDEN FINJUSTERAR.
    · Grannländerna: FI MÄTT 1/9 (Norrland >20 km 12,6→11,5 %). NO/Frost KÖRT 2/9 (DECISIONS
      #60): luckan RUBBAS INTE (9,1 km / 11,5 % i alla steg) — den är INLANDS, inte vid gränsen.
    · SMHI-luftankare: smhi-prov byggt + kört 1/9 (34 augustipunkter, INGEN dom): stör inte
      nära (2,56→2,50 °C), hjälper >20 km (5,83→4,37 °C, 4 nya punkter à 1,57 °C). Måndagar
      06:00. Vidgat 10/9 till pusselbit för "3 km fram" — se #95 (molnmängd = representativitets-
      radie, förtätning).
      🔄 **VÄNT 12/9 PÅ 56 GÅNGER MER DATA** (DECISIONS #119): 1/9:s "hjälper > 20 km" vilade på
      34 punkter varav 4 nya. Omkörningen har **1 918 jämförbara punkter** och säger motsatsen:
      bas 1,05 °C → **+SMHI 1,20 °C, alltså SÄMRE — i varje band**, inklusive > 20 km
      (1,02 → 1,35). 235 aktiva luftstationer, alla med data. De 352 punkter som bara finns tack
      vare SMHI har MAE 2,36 °C. **Läsningen är tvådelad:** som FÖRTÄTNING där VViS finns är svaret
      nej — luftankaret stör. Som RESERV där VViS saknas helt är 2,36 °C priset, och det är en
      annan fråga (§2.8 Verify 2). **§2.8:s ankarroll är därmed i praktiken avgjord utan att en rad
      byggts.** Läxa: ett fynd på 34 punkter är en riktning, inte ett resultat.
    · Höjden: UTLYFT 10/9 till eget kort #96 (Bengts order) — lapse 0,71 °C/100 m, räcker inte ensam,
      måndagar 07:00. Här kvar bara som led i rangordningen ovan.
    · GIS-svansen (dalgångar/skuggning) = kort #91 kallplatslagret. Rörs inte förrän vinterns
      höjdprov motiverar den.
  - [ ] (4) Skuggkörningen — startar när det finns halka att skugga (~mitten av oktober, Skåne).
  - [x] ~~Skuggmotorns prognoskolumn buntas ur engine/src~~ ✅ scripts/bundle-skuggmotor.ts,
    ci.yml kör --check (läxan i CLAUDE.md).
- [ ] ↩︎ Play: uppladdningsguide för den CI-signerade AAB:n + fotostudion tag 2 (facit ur CI +
  produktboken) *(låst: Play-kontot)*.
- [ ] 📈 **#88 TRENDEN — vi mäter var minut men använder bara sista värdet** (systemanalys 10/9;
  ✅ **STEG 2 BYGGT OCH KÖRT 13/9 — TRENDARKIVET** (Bengts order, issue #119, DECISIONS #169,
  PR #230). `sql/017_trend_kandidater.sql` + `scripts/trendarkivet.ts` med knapp och torrkörning.
  **3 851 kandidater över 98 stationer** 8–13/9, ur 117 962 arkivrader. Noll följdes av yta ≤ 0 °C
  inom 90 min — september, rätt utfall. Omkörning: **0 nya rader**, idempotensen bevisad med mätning.
  🏗️ **EN TABELL, INTE EN SKUGGKOLUMN — och skälet är arkitektur, inte bekvämlighet.** Skuggmotorn
  läser SNAPSHOTEN, en ögonblicksbild utan historik: lutningen finns inte där och kan inte räknas
  där. Cron är stängt sedan #85. Men ingångarna finns i arkivet — och bara i sju dygn, för
  gallringen (#83) tunnar äldre rader till en per halvtimme och då faller 15-minutersfönstret bort
  HELT. Knappen räknar inom sju dygn och skriver durabelt; check 5 larmar redan vid frost.
  🔑 **EN KÄLLA FÖR TRÖSKLARNA:** svepet och vakterna flyttade till `publish/trenden.ts`, delad av
  T-A och arkivet. Två kopior hade låtit T-A döma med en uppsättning trösklar och arkivet spara
  med en annan — domen och underlaget hade slutat handla om samma sak.
  🔒 **SUPERSETINVARIANTEN låst med prov över hela svepet (1 872 kombinationer):** fyrar någon
  kombination på en rad så ÄR raden kandidat. Faller den sparar arkivet bort precis det T-B behöver.
  ✅ **SJUDYGNSRISKEN BORTA 13/9 — BERÄKNINGEN LIGGER I `ingest-live`** (Bengts order, DECISIONS
  #170, PR #232). Noll Actions-minuter och inget nytt cron-jobb: räkningen rider på ett anrop som
  redan sker var minut. Logiken bor i `sql/018`, den deployade funktionen bär EN rad i try/catch —
  ingest-live är livemotorns ingest och trenden får aldrig kosta driften något.
  🐛 **DRIFTVAKTEN FÄLLDE PÅ FÖRSTA KÖRNINGEN: 862 av 4 713 rader låg isär, och orsaken var
  ARITMETIK.** TypeScript räknar 4,8 − 4,4 = 0,39999999999999947 i binär flyttal; Postgres räknar
  exakt i numeric och får 0,4. Tröskeln ÄR 0,4, så den ena valde raden och den andra inte — utan
  en enda skillnad i logik. SQL hade rätt. Lutningen avrundas nu till tusendels grad; omkörning gav
  **4 713 mot 4 713, noll i någon riktning**. Läxan förd till CLAUDE.md.
  🔍 **KONTRAKTSGRINDEN SA GRÖNT HELA TIDEN** — den vaktar att kopiorna bär samma TAL, inte att de
  fattar samma BESLUT. Det krävdes en jämförelse som kör båda sidorna över samma fönster.
  ⏳ **BEVISET ÄR OFULLSTÄNDIGT och det sägs rakt ut:** ingest-live kör (sync_state fem sekunder
  gammal) men skrev noll rader, för **0 av 750 stationer** har just nu en yta mellan 1 och 6 °C.
  Signaturen att leta efter i morgon: en rad med `utfall_rader IS NULL` och `observed_at` inom 90
  minuter — den kan bara ha skrivits av driften.
  ✅ **GRIND T-A BYGGD OCH KÖRD 12/9 — instrumentet är laddat före frosten** (`scripts/grind-t-a.ts`
  + knapp, PR #158, körning 34675279484, DECISIONS #113). Byggd FÖRE skuggkolumnen med flit: T-A
  läser ARKIVET, de tre kolumnerna i §7 steg 2 matar T-B. Avvikelse från §7:s ordning, inte från
  dess innehåll, tillåten före första skuggkörningen enligt §8.
  ⊘ **Utfall: OAVGJORT, som det ska vara.** 2 912 station-nätter, 17 frostnätter på 7 stationer mot
  domspärrens 30 och 20. Alla 144 kombinationer räknade; bästa separation 17 %, men **ingen klarar
  båda-halvor-kravet**. Domspärren skrivs ut FÖRE tabellen så ingen läser den som en dom.
  ☁️ **FYSIKKONTROLLEN ÄR HEL SEDAN 12/9** (PR #163, körning 34677154925, DECISIONS #115). Molnet
  hämtas VID KÖRNING ur SMHI parameter 16 — ingen arkivering, ingen tabell, noll lagring. 16 av 17
  frostnätter fick en molnobservation inom 50 km från 6 stationer.
  ✅ **FÖRSTA SIGNALEN STÖDJER UTSTRÅLNINGSHYPOTESEN: fyrningsandel klara nätter 29 % (2 av 7) mot
  mulna 0 % (0 av 5).** Triggern fyrar på klara nätter och inte på mulna, precis som
  utstrålningskylning förutsäger. **MEN TALET ÄR TVÅ** — riktningen är rätt, styrkan okänd.
  🕳️ **Och en olöst observation:** timfördelningen är fortfarande platt (5 av 17 kl 03–07; resten
  22, 23, 10, 11, 12, 14). Septembers "frostnätter" är till största delen INTE utstrålningsnätter.
  Att triggern ändå skiljer klart från mulet är förenligt med att de få utstrålningsnätter som finns
  är just de klara — men det stärker att underlaget måste vara höstens frost.
  🔍 **Tre fynd som hör hemma i TROSKLAR-TRENDEN, inte i koden:** (1) **fysikkontrollens andra halva
  går inte att köra** — "vanligast klara nätter" kräver molnmängd, som inte finns i arkivet. T-A är
  alltså BEROENDE AV kort #95, och det står inte i dokumentet. (2) **Gallringen äter svepet:** efter
  sju dygn faller 15-minutersfönstret bort helt och 30-minuters på trendens egen vakt. (3) Septembers
  frostnätter är INTE utstrålningsnätter — bara 5 av 17 hade kallaste stunden kl 03–07.
  det billigaste stora klivet). Sedan 9/9 har arkivet minutupplösning på 848 stationer. Lutningen
  dT/dt på ytan mot noll, med daggpunkten strax under, är svartisens fysiska förvarning — INGEN
  prognos, en observerad trend, som får sägas som "risk framöver" (kommunikationsregeln). Åt andra
  hållet: stigande yta = skälet att tystna tidigare på morgonen. 🔒 NYCKEL: tröskeldokument först
  (husregeln: lutning över hur många minuter, vilket daggpunktsgap), sedan SKUGGKOLUMN i skuggmotorn,
  aldrig röst före dom. Efter 14/9 (kort #81:s ordning). Verify: skuggkolumnen bokförs mot samma
  facit som #16/#38b; andelen träffar där punktmotorn var tyst eller > 30 min senare (B3-måttet).
  ✅ **TRÖSKELDOKUMENTET FASTSTÄLLT 10/9, INCHECKAT 11/9** (DECISIONS #92). `docs/TROSKLAR-TRENDEN.md`,
  225 rader: sju OSATTA parametrar med svep (fönster 15/30/60 min, lutning 0,4–1,2 °C, daggpunktsgap,
  startband, stigande tröskel, nära-miss-band, utfallsfönster), ärvd givarvakt (#46:s daggpunkt +
  #75:s WX_SANE + trendens egen: ≥ 3 mätningar i fönstret, hopp > 3 °C diskvalificerar), tre grindar
  T-A/T-B/T-C, och en ASYMMETRISK falsklarmsdefinition — "risk som inte föll ut" (ytan inom 0,5 °C
  på 90 min) räknas INTE som falsklarm, eftersom trenden säger *risk*, inte *är*. Golv: B3 ≥ 20 %,
  nettonytt ≥ 5 %, falsklarm ≤ 25 %; domen är korsningskurvan, golven hindrar bara röst på brus.
  🕳️ **DOKUMENTET LÅG OINCHECKAT I ETT DYGN** (skrivet 10/9 23:04, incheckat 11/9 på Bengts order).
  Det fanns varken på origin, i gren eller PR — enda kopian låg i ett arbetsträd. Repot är enda
  synken mellan sessioner; ett dygns arbete hängde på en disk. Läxa förd till CLAUDE.md.
  ✅ ~~**DANGLANDE KÄLLA:** `docs/TROSKLAR-TYSTNADSFEL.md` finns inte i repot~~ **STÄNGT 11/9**
  (DECISIONS #93): dokumentet låg i Bengts Drive, skrivet 10/9 21:09, två timmar FÖRE trenden — och
  gick samma väg som trenden, alltså aldrig in i repot. Nu fastställt och incheckat som **kort #98**.
  ⚠️ **MEN DET AVSLÖJADE ETT SAKFEL I §6 HÄR:** trenddokumentet säger att T-B har "samma beroende som
  TROSKLAR-TYSTNADSFEL", alltså kort #94 (försäkringsbolagen). Tystnadsfelets §8 skrevs om samma kväll
  21:09 och tog uttryckligen BORT det beroendet — måttet döms mot facitstacken vi redan skriver varje
  dygn. Trenden skrevs 23:04 och citerade alltså en version som redan var ersatt. §6 är rättad.
  ✅ ~~ÖPPEN FRÅGA: kan T-B sluta vänta på #94?~~ **AVGJORT 11/9 av Bengt (DECISIONS #94): JA.**
  "Vi kommer inte att vänta på några försäkringsbolag i T-B. Det är klarlagt att vi inte kan få det
  samarbetet." T-B döms mot facitstacken vi redan skriver: kamerafacit (#20) som bärande källa —
  738 av 744 kameror står vid en VViS-station (#55), alltså per konstruktion inom räckvidd, precis
  T-B:s räckviddsvillkor — plus road_condition_history och situation_archive (#33).
  ⚡ **TIDPLANEN FLYTTAS: T-B skuggar från FÖRSTA FROSTEN, inte från mars.** Mars-domen är inte
  längre T-B:s förutsättning utan dess fördjupning. §6 och §7 i dokumentet omskrivna.
  ✅ ~~KVAR FÖRE BYGGE: Axels bock här~~ **KONTRASIGNERAT 11/9 av Axel via Bengt** (DECISIONS #95,
  samma form som #61/#68). Tröskeldokumentet är därmed fullt godkänt av båda. Kvar före bygge är
  bara radardomen 14/9 (kort #81:s ordning) — ingen mänsklig signatur saknas längre.
  ⚠️ Bocken ändrar INTE §8:s regim: den är knuten till första skuggkörningen, inte till signaturen.
  Fram till dess får svepet i §2 och kraven i §4 justeras av vem som helst av oss med en rad i
  DECISIONS; därefter krävs båda signaturer och en motivering som inte lutar sig mot utfallet.
- [ ] 🤐 **#98 TYSTNADSFELET — mät tystnadens fel, inte larmens träff** (B3-syskon till #88; skrivet
  10/9 21:09, hittat i Bengts Drive 11/9, FASTSTÄLLT 11/9 på Bengts order, DECISIONS #93).
  `docs/TROSKLAR-TYSTNADSFEL.md`. Avgör Bengts egen tvist från 10/9 med data i stället för princip:
  en missad svartisvarning kan döda, ett falsklarm irriterar — men varje larm sänker värdet av nästa.
  **MÅTTET:** varje bekräftat halttillfälle där systemet TEG klassas som *oursäktligt* (signal fanns:
  daggpunktsgapet slöt sig, trenden pekade mot noll, eller en station inom räckvidd visade risk) eller
  *ursäktligt* (ingen signal: snöby bara radarn ser #43, saltbil, kommunal gata utan givare #93). Bara
  det oursäktliga går att laga med en tröskel; det ursäktliga pekar på nya källor. **PRISET STÅR
  BREDVID:** nya falsklarm per kandidattröskel. Två kurvor mot tröskeln, och där marginalen korsar
  sitter den. **RÄCKVIDDSVILLKORET (§6) är det avgörande:** en tyst miss räknas bara när halkan låg
  inom räckvidd men utanför rösten — annars drunknar tröskelsignalen i täckningshål (#93), som är ett
  annat problem. ✅ ~~NYCKEL: Axels bock här~~ **KONTRASIGNERAT 11/9 av Axel via Bengt** (DECISIONS
  #95, samma form som #61/#68/#92) — dokumentet är fullt godkänt av båda. Kvar: skuggkolumn efter
  radardomen 14/9; aldrig röst före grind-A/B/C-dom i mars.
  ⚡ **KAN BÖRJA RÄKNAS I HÖST, INTE I MARS** — §8 skrevs om 10/9 kväll när försäkringsbolagens
  skadedata visade sig otillgänglig: måttet döms i stället mot facitstacken vi redan skriver varje
  dygn (road_condition_history, kamerafacit #20, situation_archive #33). Inget samarbete utanför
  huset krävs. ✅ **BEKRÄFTAT SOM HUSREGEL 11/9 (DECISIONS #94, Bengt):** samarbetet med
  försäkringsbolagen är klarlagt otillgängligt. Samma facitstack gäller nu även trendens T-B (#88),
  som därmed skuggar från första frosten i stället för att vänta på mars.
  Verify: korsningskurvan ritad över hela svepet, med räckviddsvillkoret tillämpat och binomialbrus
  redovisat; utfallsmeningen i §7 ifylld med riktiga N, M, X och Y.
- [ ] 🔀 **#89 ÖVERGÅNGARNA mellan faror — regn→frost, torka→första regnet** (systemanalys 10/9;
  syskon till #45 som redan har snö-på-snö/regn-på-snö). (a) Regn som slutar och yta som faller under
  noll inom 2 h = efterhalka: regnsumma + yttemp + trend (#88) finns alla, inget sitter ihop. (b) Första
  regnet efter ≥ 5 torrdygn: oljefilm, de första 20 minuterna hala oavsett fart — en torrdygnsräknare
  per station ur regnarkivet, en kolumn. (c) Dimma×frysrisk = rimfrost (#46), sidvind×halka och
  dimma×halka har ingen förhandlad interaktion alls (bara halka×vattenplaning har det, #68).
  🔓 **UPPLÅST 13/9 (DECISIONS #161, Bengts order):** regelskissen pekade på `rate_max`, som är
  SPÄRRAT av värdevakten sedan 727,54 mm/h hittades i det (#134). Bytt till **`rate_mean_mmh`** —
  en tvingad rättelse, inte en justering mot ett utfall. Svepet 0,1 · 0,5 · 2 är oförändrat och
  blir dessutom rätt matchat: de talen kommer ur bekräftelsekurvans band, som mättes på just
  `rate_mean`. Skalan utskriven i §2 (råradar; i stationens skala ≈ 0,15 · 0,8 · 3,1).
  **Skuggkolumnen är därmed inte längre blockerad** — den väntade på radardomen, och den föll 13/9.
  🔬 **OMPRÖVNING GÅR VIA MÄTNING, inte via städning:** `cell-matning-v3.ts` läser redan BÅDA
  fälten på samma rad, så en bekräftelsekurva för `rate_max` är en KÖRNING och inte ett bygge.
  Visar den att max bekräftas väsentligt bättre är det skäl att rensa fältet och byta tillbaka.
  Att rensa `rate_max` FÖR ATT låsa upp det här kortet vore däremot att låta schemat välja fält.
  🔒 NYCKEL: #45:s dom + tröskelrader (§5). Verify: varje övergång som egen skuggkolumn med
  facit ur situation_archive; (b) kan mätas redan i höstregnen.
  ➕ **NY PARAMETER `N_varning` 12/9 kväll** (§2.3 i tröskeldokumentet, Bengts order, DECISIONS #123).
  Kom hit från #95 (d): när den breda SMHI-regeln föll — *ett län är ingen punkt och ingen sträcka* —
  var dess berättigade kärna kvar. SMHI vet **tiden före händelsen** (varningarna publiceras i
  förväg), och det går att använda utan att uppfinna väta ur en polygon: **en aktiv vintervarning
  förlänger N**, alltså hur länge efter stationens EGET uppmätta regn frysrisken lever vidare.
  Utlösaren är oförändrad. Svep **av · 2 · 4 · 6 h** mot N:s 1 · 2 · 3 · 4.
  ⚠️ **Ingen gratis ändring, och dokumentet säger det rakt ut: N_varning fyrar larm som annars inte
  fyrat.** Därför gatas den som en egen proxy — **B3 körs med och utan förlängningen** — och går den
  inte att döma sätts den till AV, aldrig till ett gissat värde. Dömbar först på varningar skrivna
  efter `sql/015` (12/9), för dessförinnan saknade arkivet giltighetsfönstret.
  📎 **HISTORIK:** §2.3 lades till 12/9 efter fastställandet. Axel är underrättad och har läst den.
  **Den blockerar ingenting** (DECISIONS #132): mätningen är Bengts område, motorn och rösten Axels.
  📄 **FÖRSTUDIE SKRIVEN 11/9** (Bengts "gör en ordentlig genomlysning"): `docs/OVERGANGAR-ANALYS.md`,
  samma form som vattenplaningens. Ingenting beslutat. Tre fynd som ändrar kortet:
  🕳️ **(a) ÄR ETT HÅL, INTE ETT SAMBAND.** `icing_point` kräver `moisture === true` (engine.ts:191), och
  `moisture` = `rain OR snow OR precipitation` ur 10-minutersaggregatet (weather.ts:54, snapshot-core:42)
  — alltså "regnar det JUST NU". När regnet slutar blir fukten falsk inom tio minuter och frysrisken
  kan inte fyra igen förrän det regnar på nytt, oavsett hur blöt vägen är och hur kall ytan blir.
  Efterhalkan inträffar nästan alltid EFTER att nederbörden upphört — exakt i det fönstret tiger regeln.
  Ingen blöt-väg-givare finns i skala (TRV har ytstatus på 30–50 av ~750 stationer, vi hämtar dem inte).
  Rättelsen är en utvidgning av fuktvillkoret med regnhistorik: `fukt OR regn inom N h`. Strikt
  superset, kan bara lägga till larm ⇒ döms med B3-paret (räddade missar mot tillkomna falsklarm).
  🔀 **(a), (b), (c) är tre olika sorters arbete** och ska inte dela nyckel: (a) utvidgar en regel
  som finns (B3-mått), (b) är en NY fara (V-B-mått, från noll), (c) är prioritetsregler som hör hemma
  i #46:s (dimma = konfidens för daggpunktsregeln) och #90:s (sidvind/dimma × halka, #68 som mall)
  tröskeldokument. Förslag: #89 lämnar över (c) och behåller (a) + (b).
  🔓 **NYCKELN #45:s dom ÄR FEL LÅS för (a) och (b).** De behöver regnhistorik + yttemp, som finns per
  station sedan 2/9 — inte radarn, inte typklassningen. Bara regn-på-snö/snö-på-snö beror på #45, och
  de är redan #45:s. Förslag: dela nyckeln — (a)+(b) låses upp av eget tröskeldokument.
  ❓ **FRÅGA TILL AXEL FÖRE (b) BYGGS (förstudiens §5.6):** är oljefilm inom Halkvakts löfte? Appen
  lovar is och halka; oljefilm är halka i ordets vidare mening, inte i produktens, och är frekvent
  med tunt facit (olyckor utan orsak, ~210/dygn nationellt, 20-minutersfönster). Ett nej sparar en
  höst. Ett ja eller "mät och se" öppnar fönstret NU — höstregn efter torka slutar när vintern kommer.
  📋 **ORDNING (förstudiens §9):** (0) mät hålet nu, läsande, en minut — regnstopp per station sedan 9/9,
  hur fort fukten går falsk, vad ytan gör de följande timmarna, plus underlagsstorlek för (a) och (b);
  (1) TROSKLAR-OVERGANGAR med (a) som huvudsak och svep i stället för värden; (2) regnhistorik per
  station i Supabase efter 14/9; (3) (b) i skugga om Axel säger ja; (4) (a) i skugga, döms vid första
  frosten; (5) "regn inom N h" som fjärde signal i TYSTNADSFEL §3; (6) (c) överlämnas. Steg 0–1 är
  inte kod och kan göras i dag. Verify för steg 0: tre tal ur arkivet — hålets storlek, (a):s och
  (b):s underlag.
  🔁 **ANDRA LÄSNINGEN 11/9** (Bengts "har vi förbisett något i pipen, t.ex. 2.8?"): JA, två saker —
  men inte 2.8. Förstudiens §3, §4.2, §4.6 och §10 reviderade. (1) **`radar_precip` skriver redan
  regnhistorik PER SEGMENT** (sql/009, timvis sedan 2/9) — förbisett; gör (a) segmentnivå från dag
  ett, och datat är inte låst bakom 14/9, bara ny radarkod är det. (2) **Operatörens "Våt"** i
  väglaget är ingesterad men 100 % oanvänd (engine.ts:240 "Normalt/Våt make no sound") — Trafikverkets
  egen blöt-klassning per sträcka, var 15:e min; värdet hänger på hur länge den står kvar efter
  regnet, vilket steg 0 ska mäta. (3) **#46 och (a) partitionerar efterhalkan**, inte dubbelräknar:
  fuktig efterhalka (yta ≤ daggpunkt, kondensation) är #46:s; torr efterhalka (kallfront, daggpunkten
  faller, regnvattnet fryser) är (a):s och den enda regnhistoriken ser. (4) **§2.8 ger inget i dag:**
  smhi-prov hämtar bara lufttemperatur och lagrar inget; molnmängden är en FRYS-signal som skärper
  trenden, inte en blöt-signal som fyller hålet. Regelskissen är nu en union av proxyer, gatad per
  proxy med B3-paret — en union ingen mäter ensam är en falsklarmsmaskin. Bifynd: `types.ts:33`
  lovar "wet surface" i kommentaren; koden levererar nederbörd nu. Rättas med (a), inte förr.
  🧭 **TREDJE LÄSNINGEN 11/9** (Bengts "var kommer tillståndsövergångarna in — torr→blöt, torr→hal,
  snö→regn, regn→frys?"): de kom inte in alls, och det var förstudiens största brist. Ny §1b: din
  matris från #45 är RAMEN — vägytan är ett tillstånd, händelserna är övergångar, och §2.2:s tre
  punkter, #45:s två, #46 och #88 är kanter i samma graf. Grafen är ritad med ägare per kant.
  **KÄRNFYNDET (verifierat engine.ts:50–54): motorn minns RESAN men inte VÄGEN** — prevFix,
  odometer, kurs, tystnadsklocka, fired-karta; noll minne om vad ytan var för en timme sedan.
  Fukthålet är ett SYMPTOM av det, inte ett fel i ett villkor. Regnhistorik, daggpunkt, radar och
  operatörens Våt är fyra sätt att skatta ett tillstånd motorn inte bär. **KONSEKVENS för planen:**
  steg 2 är inte "regnhistorik" utan **tillståndsskattaren i skuggloggen** — en kolumn per segment
  ur operatörens klass + regn/snö-historik + yta + daggpunkt, med EGET facit (skattat blöt mot
  operatörens Våt, skattat is mot omklassning) innan någon övergångsregel läser den. INTE en
  tillståndsmaskin i motorn — det vore "våning två före grunden"; motorn rörs när en övergång bevisat
  sig, och då som en snapshotkolumn märkt MODELLERAT. Skattaren byggs för blöt och torr först, snö
  och is när #45 låses upp. **TVÅ CELLER SAKNAR ÄGARE:** töet (is→slask när temperaturen stiger;
  rösten tystnar i dag vid +1 medan vatten står på is) — kandidat till eget kort — och saltbilen
  (ingen öppen källa, känt). Facitmatchningen ärver #45:s baselineprincip: packad snö i norr är
  inte en övergång.
  🔬 **FJÄRDE LÄSNINGEN 11/9** (Bengts "täcks vattenplaning in? är rimfrost ett tillstånd? gäller
  samma för sidvind × halka?"): ja, ja, nej — och nejet är poängen. Vattenplaning ÄR ett tillstånd
  (vattenfilm, #42) och saknades i grafen; rättat. Rimfrost ÄR ett tillstånd (is), dimma och frysrisk
  är dess ORSAKER — frysrisk och halka är inte tillstånd utan NAMN PÅ LARM om tillstånd. Men sidvind
  och dimma-som-sikt ändrar inte ytan; de ändrar faran för föraren givet en yta. Det är **LAGER 2:
  riskmodifierare** (fart, sidvind, sikt, däck #92, mörker) — kräver INGET minne, ingen skattare,
  byggs som #68 (förvillkor/prioritet/försprång, en vektor). Lager 1 (ytan) kräver skattaren. De ska
  inte dela kort, nyckel eller mått. §6 hade blandat ihop dem: dimma × frysrisk är en lager 1-orsak
  (→ #46, konfidens för kondensationsvillkoret), sidvind/dimma × halka är lager 2 (→ #90, #68 som
  mall). Dimma sitter i båda lagren utan motsägelse. Vattenplaningen bevisar mönstret redan:
  vattenfilm × fart × däck. **Steg 0 utökat till sex frågor** (0a–0f: eftersläpning, torkningskurva,
  underlag a, underlag b, Våt-eftersläpning, radartäckning), varje med egen underlagsvakt.
  Rekommendationens "tre tal" rättat till sex svar. Förstudien sparad i repot, i Drive och som fil
  i chatten.
  ✅ **STEG 0 KÖRT 11/9** (Bengts "kör steg 0"): `scripts/overgangar-steg0.ts` + knapp
  `overgangar-steg0`, helt läsande, PR #124, körning 34579255737, 14 dygns fönster. Driftvakten
  grön: SQL-uttrycket och motorns egen `fukt()` ense om alla 7 146 omslag — mätningen ÄR motorns.
  **0a HÅLET ÄR BEVISAT OCH STÖRRE ÄN GISSNINGEN.** (Talen nedan är 14-dygnskörningens; de
  RÄTTADE talen ur den ogallrade veckan står i "GALLRINGSFÄLLAN" längst ned.) På 124 av 189
  användbara regnstopp (66 %) visade
  regnmätaren regn i de senaste 30 minuterna i samma stund som motorns fukt slog om till torrt.
  Mätaren stod kvar över noll median 35 min efter omslaget. Förstudien gissade "~10 min"; golvet är
  ~35 min, och p75/p90 (1,8–1,9 h) ligger mot 2-timmarstaket i frågan ⇒ censurerade, läs dem som
  "minst så länge". **0b RH-GUARDEN ÄR DÖD.** Luftfuktigheten STIGER efter regnet (median 90 % vid
  +1 h → 95 % vid +4 h; ≥ 80 % i 74–84 % av fallen). RH_min ≥ 80 filtrerar alltså bort nästan
  ingenting — svepet i §4.3 kan strykas till "ingen guard" tills något talar emot. **0c
  POPULATIONEN FINNS, FRYSNINGEN INTE ÄN:** 189 användbara omslag ≈ 14/dygn i riket, men bara 3–4
  följdes av yta ≤ 1 °C — och N = 1 h → 4 h lägger till EXAKT ETT fall. September, väntat; domen
  kräver frost. **0d OLJEFILMEN ÄR INTE NÅBAR I HÖST:** 55 äkta torrperioder ≥ 5 dygn, 6 olyckor i
  20-minutersfönstren; V-B kräver 15 facit-olyckor och 200 fyrningar. **0e "VÅT" ÄR OAVGJORT OCH
  FÅR INTE RÄKNAS:** 33 Våt-rader, NOLL med efterföljande klassning, noll väglagsrader i fönstret —
  arkivet står stilla sedan 25/8. Proxyn stryks ur unionen i §4.2 tills operatören klassar om igen.
  **0f RADARN:** kadensen är 24 prov/dygn × 5 min = 8,3 % av tiden samplad; 91,7 % osamplat.
  ⚠ Första körningens 0f-rad läste händelsefiltrering som kadens ("5,2 %") — rättat i skriptet
  samma varv, siffrorna oförändrade. Två kända luckor i instrumentet, att täppa före grinden:
  0a:s svans är censurerad vid 2 h och kan innehålla ÅTERKOMMANDE regn, och 0d räknar olyckor utan
  förväntat antal (ingen nollhypotes ⇒ 6 är ett tal, inte ett bevis).
  ⏳ **GALLRINGSFÄLLAN, upptäckt 11/9 vid omkörning med `dagar=7` (körning 34580876588).**
  Gallringen (#83, sql/014) tunnar allt äldre än sju dygn till EN rad per halvtimme. Gap-vakten
  kastar allt med mer än 20 min mellan raderna ⇒ hela den gallrade halvan blir GAP. Bevis:
  7 dygn gav 1 971 omslag varav **157 användbara**; 14 dygn gav 7 146 varav 189 — alltså kom
  83 % av de användbara ur den ogallrade veckan, och den gallrade halvan bidrog med 32 av 5 175.
  **RÄTTADE TAL** (ogallrad vecka, full upplösning): mätarregn vid omslaget **120 av 157 = 76 %**,
  inte 66 %. Population **22 omslag/dygn**, inte 14. Medianen 35 min står oförändrad. Hålet är
  alltså STÖRRE än jag först skrev: tre av fyra regnstopp, inte två av tre.
  📌 **REGEL SOM FÖLJER:** steg 0 körs alltid med `dagar <= 7`, och en händelse måste läsas
  INOM sju dygn — annars har gallringen ätit upplösningen och 0a/0b/0c blir OAVGJORT.
  🔁 **FEMTE LÄSNINGEN 11/9 — AXELS GRANSKNING** (DECISIONS #100)**.** Han verifierade fukthålet oberoende och vände på
  mätriktningen: från FROSTEN i stället för från regnstoppen. Han har rätt och min riktning var fel
  vald — falsklarmsrisken skalar med FYRNINGAR, inte med tillfällen — och hans riktning tål dessutom
  gallringen bättre. 0c omskriven (PR #133/#134), körning 34590257682. Hans tal: 312 frostmätningar,
  14 larmar i dag, 298 tysta, 71 med regn inom 4 h ⇒ "sex gånger talförare".
  🔢 **EPISODRÄKNINGEN SOM SAKNADES, och den ändrar tolkningen.** Motorn talar inte per arkivrad
  (45 s mellan larm, ingen repris inom 10 min/5 km, snapshot var 10:e min). Räknat i BÅDA enheterna,
  efter givarvakten: **rader 123 → 2 larmar i dag, 25 tysta med regn ≤ 4 h ⇒ 13,5 ×. EPISODER 15 → 2
  larmar, 2 med regn ≤ 4 h ⇒ 2,0 ×.** 8,2 rader per episod, 6 stationer. Sexan är alltså ett
  RADtal; röstkostnaden är en fördubbling av 2 fall till 4, över fjorton dygn. Korskontroll: den
  omslagsbaserade riktningen fann 4 — samma handfull väder räknat från andra hållet.
  🚨 **OCH ETT FYND SOM GÄLLER LÅNGT UTANFÖR DET HÄR KORTET: 61 % av arkivets frostrader är skrot.**
  Av 317 frostrader (yta ≤ 1 °C) föll 194 på givarvakten (#75) — ytan mer än 12 ° under luften,
  värst −49,9 °C. NOLL saknade lufttemperatur, så det är trasiga givare, inte okontrollerbar data.
  Varje mätning som läser yttemperatur måste bära vakten, annars är sex av tio frostfall falska.
  **Det gäller #88:s trend och #98:s tystnadsfel lika mycket, och står inte i deras tröskeldokument.**
  ✏️ **INFÖRT I FÖRSTUDIEN** (PR nedan): nytt §4.7 röstbudgeten (hålet Axel hittade — dokumentet sa
  ingenting om vad utvidgningen gör med tystnaden, och åberopade husregeln för (b) men inte för (a));
  §4.3 RH-guarden struken och N sätts av golvet, inte av svepet (kurvan har inget knä: 22→25 rader,
  1→2 episoder); §4.4 grinden får ord-per-resa som eget fällande kriterium; §3 givarvakten; §9 0c
  omskriven och (b) flyttad ur steg 0 till §5.6-frågan, som dokumentet alltid sagt men §9 motsade.
  ✅ **STEG 1 KLART 12/9 — `docs/TROSKLAR-OVERGANGAR.md` FASTSTÄLLT OCH KONTRASIGNERAT**
  (Bengt 12/9 med tillägget att **(b) oljefilmen stryks**, Axel 12/9 via Bengt; DECISIONS
  #109/#110/#111). Nyckeln är därmed öppen — kodstegen väntar bara på radardomen. Skrivet på MÄTNING, inte på
  resonemang: varje tal som inte är märkt RESONEMANG kommer ur steg 0. Fyra grindar — **Ö-A**
  (finns hålet? **redan passerad**: 76 %, median 35 min, 22 omslag/dygn), **Ö-B** (B3-paret per
  proxy, döms vid frost), **Ö-C** (giltighet: ≥ 30 nätter, ≥ 20 stationer, fysikkontrollen),
  **Ö-D** (läsfönstret — sju dygn, annars har gallringen ätit upplösningen).
  ✂️ Två parametrar redan strukna av mätning: RH-guarden (fuktigheten stiger efter regnet) och
  operatörens "Våt" (noll mätbara varaktigheter). N sätts av golvet, inte av svepet — kurvan har
  inget knä. Ord-per-resa är INTE fällande kriterium (#103); röst räknas i episoder, aldrig i rader.
  🔗 **TYSTNADSFEL §3 har fått sin fjärde signal** i samma varv: "det regnade inom N timmar vid
  stationen". Utan den klassas efterhalkans missar på de andra tre utan att orsaken syns.
  ✂️ **(b) OLJEFILMEN STRUKEN 12/9 av Bengt.** Kortet krymper till (a) plus överlämningen. Och
  **§5.6-frågan till Axel förfaller** — den behöver aldrig ställas, kortet bär inte längre en spärr
  som väntar på någon annan. Mätningen hade redan visat att grinden inte var nåbar i höst (55
  torrperioder, 6 olyckor mot kravets 15) och att instrumentet saknade nollhypotes. Tas frågan
  någonsin upp igen börjar den om från steg 0, inte från texten.
  ✅ **STEG 2 BYGGT OCH KÖRT 13/9** (Bengts "bygg steg 2 nu på det som finns" + "kör knappen",
  DECISIONS #167, PR #223/#225/#226). `publish/tillstand.ts` (ren skattare, blöt/torr/okänt per
  segment och timme) + `scripts/tillstand-steg2.ts` med knapp. **Svepen är §2:s ord för ord** —
  skattaren uppfinner ingen tröskel, och ett prov faller om de driver isär.
  🔓 **VARFÖR DET GICK ATT GÖRA TROTS ATT GRINDEN INTE KAN DÖMAS:** dokumentet lyder "eget facit
  först … INNAN någon övergångsregel läser den". Grinden spärrar ANVÄNDNINGEN, inte bygget — den
  spärrar alltså steg 3, inte steg 2.
  🚫 **INGEN SKRIVANDE KOLUMN.** Ingångarna är sparade och gallringen rör bara
  `weather_observations`, så skattningen räknas om i efterhand för vilket fönster som helst — också
  för frostnätterna, inom Ö-D:s sju dygn. En kolumn hade dessutom krävt ett nytt cron-jobb (#85).
  📊 **RADARN ÄR PRECIS MEN INTE KÄNSLIG — mätningens bärande fynd.** När radarn säger regn håller
  stationen med i **96,0 %** (2 338 av 2 435). När stationen säger regn håller radarn med i **39,9 %**
  (2 338 av 5 858). Radarn har en åsikt om bara **13,1 %** av segmenttimmarna; resten är OSAMPLAT,
  inte torrt. I unionen bidrar radarn med **97 timmar av 5 955**. N dominerar r: 1 → 4 h ger
  +11 procentenheter blöt, r 0,1 → 2 tar bort 4.
  ⚠️ **Och det testade radarn där den behövs MINST:** median 6,7 km till närmaste station. Segment
  långt från station är inte mätta — det är den naturliga nästa frågan, inte ett avfärdande av radarn.
  🐛 **TRE FEL I MITT EGET INSTRUMENT, funna av att knappen faktiskt trycktes** (alla rättade och
  omkörda): 2c läste en saknad radarrad som "torrt" — exakt det modulen förbjuder; 2d:s nämnare är
  arkivdietens urval och skriptet sa det inte; och nämnarna räknade det nominella fönstret (7 dygn)
  mot ett arkiv som sträcker sig 5,3, vilket gav radarn 8,7 % täckning i stället för 13,1 %. Det
  tredje var nära att bli en FALSK BEKRÄFTELSE mot steg 0:s 0f-tal 8,3 %.
  ⛔ **2e OPERATÖRSFACIT: ⊘ INGEN DOM, med mätt orsak.** `road_condition_history` står stilla sedan
  25/8, dess 33 blöta rader slutar **12 juni**, `radar_precip` börjar **2 september** — fönstren
  överlappar inte med en dag, och bara **12 av 818 segment** har någonsin bytt klass.
  📏 **2f MÄTT 13/9 — RADARNS BIDRAG VÄXER INTE MED AVSTÅNDET** (Bengts order, DECISIONS #168).
  Unikt bidrag per avståndsband vid r ≥ 0,5: **1,4 · 1,6 · 2,0 · 1,6 %** (0–5 · 5–10 · 10–20 ·
  20–50 km). Vid r ≥ 0,1: 10,4 · 10,1 · 10,4 · 9,4 %. **Ingen lutning.** Radarn är begränsad av
  sin egen sampling (13,1 % av segmenttimmarna), inte av geografin. Oenigheten växer visserligen
  (58 → 70 %) men i riktningen **bara stationen** — asymmetrin pekar åt fel håll för hypotesen.
  ⚠️ Bandet 20–50 km bär 25 segment och 149 jämförelser — tunt. Och fönstret är 5,3 dygn regnigt
  september: frontregn är storskaligt, konvektiva skurar lokala. Kör om 2f i annat väder.
  ➡️ **NÄSTA: steg 3**, som väntar på operatörens klasser OCH på frosten.
  (0d säger att den inte kan dömas i höst), "Våt" ute ur unionen, RH-guarden struken.
  🥶 **OCH EN KÖRNING NÄR FROSTEN KOMMER — LARMET BYGGT OCH BEVISAT 11/9** (Bengts order).
  0c är den enda frågan vars svar ändras (3–4 frysningar i dag, domen kräver ~30), och den måste
  läsas inom sju dygn efter frostnätterna (gallringsfällan ovan). Passiv påminnelse räcker inte
  när fönstret är en vecka, så påminnelsen larmar nu själv: **check 5 i vakthunden** (PR #128),
  timvis i Supabase, noll Actions-minuter. Larmar en enda gång när ≥ 50 stationer haft yta
  ≤ 0 °C senaste dygnet ⇒ issue med etiketten `frostlarm`, tilldelad Bengt, som säger "tryck
  `overgangar-steg0` med dagar=7 inom sju dygn" och hänvisar till #88:s T-A i samma varv.
  Statusraden skrivs varje timme så talet går att följa: `frost: N stationer (larm vid 50)`.
  Prov: `frostprov` i dbknapp-knappen, egen etikett så det riktiga engångslarmet aldrig förbrukas.
  🐛 **PROVET HITTADE ETT FEL I LARMET, vilket är vad prov är till för.** Första körningen (issue
  #129) skrev "4 stationer … kallast −49,9 °C" — ingen vägyta, en trasig givare av Storvik-sorten
  (#75). Frågan saknade givarvakten. Rättat i PR #130 med ett krav STRÄNGARE än snapshotens:
  lufttemperaturen måste finnas, så att rimligheten alls går att pröva. Bevis efter deployen
  (f964dd6): `frost: 1 stationer` mot provets 4 — tre av fyra var givare vi inte kan lita på.
  Passiv påminnelse finns kvar som issue #127 (`efter-frosten`) och som minnesfil.
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
- [ ] ~~🔇 **#100 Dämpning per FARA och sträcka, inte per id — före vintern**~~ (följd av #99, kandidatkort
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
- [ ] 🌬️ **#90 VIND OCH SIKT — AXELS JA GIVET 12/9, TRÖSKELDOKUMENT SKRIVET** (systemanalys
  ✅ **`docs/TROSKLAR-VIND-SIKT.md`** (utkast 12/9, DECISIONS #112). Axels ja öppnade halva nyckeln;
  **fastställt 12/9 av Bengt** (DECISIONS #135) — svepet och kraven är låsta.
  ⚠️ **RÄTTAT 12/9 KVÄLL — TVÅ SAKFEL I DOKUMENTET** (DECISIONS #116). (1) §4 påstod att
  "exponeringen är mätt kontinuerligt vid varje station". Fel: **arkivdieten** (#4) sparar bara rader
  vid yta ≤ 5 °C, nederbörd eller Δyta ≥ 0,5 °C, så W-A:s nämnare är stationstimmar **som dieten
  sparade**. Samma klass av fel som 0f:s — att läsa en händelsefiltrerad tabell som en kadens, andra
  gången på två dygn. Täckningsgraden mäts nu i givarkollen och skrivs ut med varje utfall.
  (2) **"42,6 % täckning" är ett TIDSARTEFAKT, inte ett givarhål** — 751 stationer bär fälten; det är
  dygn utan rader som saknas.
  📏 **OMKÖRT OCH MÄTT 12/9** (DECISIONS #120) — och min härledda gissning var nästan dubbelt så hög
  som verkligheten: första arkivtimmen med byvind är **4/9 05:00 ⇒ 8,1 dygn** av fönstrets 14, och
  det faktiska underlaget är **27 557 stationstimmar av 145 819 möjliga = 18,9 %**. Minutkrisens
  lucka 5/9→9/9 tar ungefär halva tiden, dieten två tredjedelar av resten. (Jag skrev först "tre
  dygn", härlett ur #84:s `vind 0` — den nollan gällde luckan, inte fälten. **Tredje gången på två
  dygn som ett härlett tal faller på en mätning.**)
  ⇒ **W-A:s OAVGJORT går inte att laga med ett längre fönster, bara med mer tid. Grinden körs om
  efter FÖRSTA HÖSTSTORMEN**, som T-A körs om efter första frostnatten. Ingen gallringsdeadline här.
  Utfallet oförändrat: 36 stationstimmar i högsta bandet mot kravets 500; antydan 2,23 × står kvar.
  🔀 **DOKUMENTET DELAR KORTET I TVÅ ROLLER som döms var för sig** — kortet sa "punktfaror",
  överlämningen från #89 sa "riskmodifierare", och **båda hade rätt**: (A) EGEN FARA — byvind 25 m/s
  på en bro är farligt oavsett väglag; (B) MODIFIERARE — samma is, sämre grepp i sidled. Faller A men
  håller B är utfallet "vind är ingen egen fara men förvärrar halkan", vilket är ett giltigt svar.
  ⚠️ **PER FORDONSTYP GÅR INTE LÄNGRE** — kort #92 stängdes samma dag (#108), så motorn vet inte om
  den talar till en personbil eller en husvagn. En tröskel för husvagn pratar för mycket med
  personbilister; en för personbil missar B2B-gruppen som motiverade kortet. Svepet spänner hela
  intervallet och **grinden får avgöra** — räcker ingen enda tröskel är det ett mätt argument för att
  öppna #92 igen.
  🔬 **GIVARVAKTEN ÄR OMÄTT TERRITORIUM.** För yttemperaturen vet vi att 61 % faller på vakten
  (#106). För vind och sikt vet vi **ingenting** — ingen har mätt hur ofta värdena är orimliga.
  Därför är steg 0 inte valfritt.
  ✅ **STEG 0 KÖRT 12/9** (`scripts/vindsikt-steg0.ts` + knapp, PR #159, körning 34675456017,
  DECISIONS #113). W-A gav **OAVGJORT** för både vind och sikt — 36 respektive 83 stationstimmar i
  högsta bandet mot kravets 500. September är inte blåsigast på året; underlagsbesked, inte nej.
  🔬 **MEN GIVARKOLLEN GAV TVÅ KONKRETA SAKER TILL VAKTEN, vilket var hela poängen:**
  **(1) byvind max 85,5 m/s** — Sveriges rekord ligger kring 81 och då på fjällstation; 85,5 vid en
  vägstation är med all sannolikhet en trasig givare, och vakten behöver ett tak.
  **(2) sikt 20 000 m förekommer 45 650 gånger** av ~92 000 siktrader — det är ett SENTINELVÄRDE
  ("minst 20 km"), inte en mätning. Hälften av siktmaterialet är ett tak.
  **(3) täckningen är 42,5 % för byvind och 42,6 % för sikt** — mindre än hälften av arkivraderna
  bär fälten alls, vilket halverar W-A:s underlag och ska stå i varje dom.
  Noll rader med byvind < medelvind och noll negativa värden — den delen av vakten behövs inte.
  📈 **EN ANTYDAN SOM INTE FÅR ÖVERTOLKAS:** bandet 10–15 m/s har **2,23 × olycksfrekvensen** mot
  < 10 m/s (89,5 mot 40,2 per 1 000 stationstimmar). Det är över W-A2:s krav på 1,5 × och den första
  kvantitativa antydan att kortet har något att mäta. Men det är ETT band, i september, och
  situation_archive bär ingen orsak — samband, inte kausalitet.
  ✅ **VINDTAKET G_tak SATT 13/9** (DECISIONS #163, PR #219). Översta bandet går från `[20, 999]`
  till `[20, 30]` — 87,7 m/s låg i exakt de 45 stationstimmar domen vilade på. Svepet 30·40·50 är
  dokumentets eget; lägsta steget valt, och varje steg skrivs ut vid varje körning.
  ✅ **STATIONSVAKTEN BYGGD 13/9** (Bengts order, DECISIONS #164, PR #220). Ett värdetak tar bort
  dåliga AVLÄSNINGAR, inte en dålig STATION: 2312 bar 26 av 36 timmar över 30 m/s spridda över hela
  arkivet. Kriteriet är fysik, inte en ID-lista — en stationstimme är omöjlig vid byvind ≥ 15 m/s
  och byvindfaktor > 5. **9 stationer diskas ur B1, ingen ur B2** (siktgivaren på samma stolpe är
  ett annat instrument). Effekt: −1,1 % av arkivets stationstimmar men **−67 % av högsta bandet**
  (9 → 3) — det bandet bestod till två tredjedelar av trasiga givare.
  ⚠️ **FÖRSTA KRITERIET FÖLL PÅ SIN EGEN MÄTNING och det står kvar i koden som varning:** kvoten
  per rad diskvalificerade **335 av 748 stationer** och åt 47 % av B1. Byvinden är ett max över ett
  bakåtfönster, medelvinden är ögonblicket — kvoten var två tidsfönster delade med varandra. Taket 5
  flyttades INTE (arkivets p99,9 är 3,08); det var nämnaren som var fel.
  🔎 **TVÅ AV DE NIO (2438, 2107) HAR SINA OMÖJLIGA VÄRDEN UNDER 30 m/s** — G_tak kan aldrig se dem.
  Det var okänt när kortet beställdes och är vaktens starkaste existensskäl.
  ⏭️ **TILL BENGT:** de nio stationerna har en trasig byvindgivare. Skriptet listar dem, det anmäler
  dem inte — en anmälan till Trafikverket är ett eget beslut (eget kort om det ska göras).
  ⏱️ **STEG 0 KUNDE GÖRAS FÖRE RADARDOMEN:** givarkollen + grind W-A mot arkivet. W-A frågar om
  olycksfrekvensen stiger monotont med byvind respektive sjunkande sikt — och till skillnad från
  vattenplaningen **går nollhypotesen att räkna här**, eftersom exponeringen mäts kontinuerligt vid
  varje station. Faller W-A är kortet klart utan en rad motorkod.
  🥈 Roll B byggs FÖRE roll A (billigare, ingen ny fara) och blir **den första lager 2-regel som
  faktiskt skrivs** — #68 beslutades men byggdes aldrig. Designfrågan besvarad: modifieraren
  FÖRLÄNGER FÖRSPRÅNGET, den höjer inte prioriteten, för prioritetsstegen droppar förloraren.
  (systemanalys
  📥 **ÖVERLÄMNAT FRÅN #89 den 12/9** (TROSKLAR-OVERGANGAR §6, DECISIONS #109): sidvind × halka och
  dimma-som-sikt × halka är **LAGER 2 — riskmodifierare**. De ändrar inte ytan, de ändrar faran för
  föraren GIVET en yta. Följden är att de **inte behöver minne och inte tillståndsskattaren** — de
  byggs som #68 var tänkt: ett förvillkor eller ett längre försprång, en rad i tröskeldokumentet, en
  vektor. Väsentligt billigare byggform än lager 1. Öppen designfråga som hör hemma i #90:s dokument:
  ska sikt/sidvind MODIFIERA halkvarningen (längre försprång, sämre reaktionstid) i stället för att
  bara förlora prioritetsstriden? ⚠️ Notera att #68 är BESLUTAD men aldrig byggd — den visar formen,
  bevisar den inte. Första lager 2-regeln som faktiskt skrivs blir precedensen.
  10/9). wind_speed_ms/wind_gust_ms/visibility_m landar varje minut (kort #84). Sidvind på broar och
  slätter är en riktig risk för husbil, släp och lastbil (= B2B, #92/#94); dimma är en fartfråga.
  Båda är PUNKTKÄLLOR ⇒ "framöver", aldrig "på vägen". 🔒 NYCKEL: Axels ja + tröskeldokument (byvind
  m/s per fordonstyp, sikt m), plats i A-skalan under halkan, vektorer i tre portar. Skugga först.
  Verify: skuggkolumn med facit ur situation_archive (vindrelaterade olyckor) en höstmånad.
- [ ] 🏔️ **#91 KALLPLATSLAGRET — bron är ett specialfall av "strukturellt kallare platser"**
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
- [ ] ⛰️ **#96 HÖJDPROVET — terrängens första faktor, mäter redan** (utlyft ur #38b 10/9 på Bengts order:
  "höjdmätningar o nivåskillnader är väl också en del av detta" — ja: terrängfaktorn i #95:s lager och
  grunden för #91). scripts/hojd-prov.ts + knappen Actions → hojd-prov: EU-DEM 25 m via opentopodata,
  747/757 stationer, tre varianter RÅ / RÅ+HÖJD / OFFSET=taket mot arkivet. FYND 1 (starkt, 3 455 par):
  empirisk lapse **0,71 °C/100 m** (standard 0,65) — höjden bär en äkta del av parsystematiken.
  FYND 2 (ärligt, 40 augustipunkter): rå+höjd 8,36 ≈ rå 8,36 mot offsetens 2,50 °C — i utstrålningslägen
  räcker höjden INTE ensam, den vänder t.o.m. tecken i inversionsnätter (kalluft i dalen). Aldrig
  fristående: felkartan dömer, luftankarna lagar, höjden finjusterar. AUTOMATISK måndagar 07:00 UTC
  sedan 4/9. ⚠️ Måndag 7/9 kördes aldrig (hela mätserien föll i spending-limit-stoppet, 2 s) — nästa
  14/9 07:00, samma morgon som radardomen. Höjd lagras inte i databasen; korrektionen finns bara i
  provskriptet, aldrig i motorn. 💰 1 Actions-min/vecka ≈ 0,4 kr/mån, 8 API-anrop, 6 kB om höjden
  lagras. 🔒 NYCKEL: vinterdata (≥ 500 punkter) — samma dom som grind A. Sedan: höjd som kolumn i
  weather_latest (så snapshoten och #91 kan läsa den) kräver tröskelrad i TROSKLAR-SKUGGAN.
  Verify: måndagsserien 14/9 grön med hojd-prov-sammanfattning; vinterkurvan lapse/MAE per band växer
  vecka för vecka utan knapptryck. Resonemanget: Drive-dokumentet v3 §2.4.
  ✅ **OMKÖRT 12/9 PÅ KNAPP** (Bengts "ta alla fem", DECISIONS #119) — och båda fynden ska rättas:
  **FYND 1 rör sig:** empirisk lapse **0,63 °C/100 m ur 3 476 par**, inte 0,71 ur 3 455. Med mer
  underlag gick talet NÄRMARE lärobokens 0,65, inte längre ifrån. **FYND 2 håller, med 49 gånger mer
  data:** på 1 962 punkter (mot 40) är rå 1,65 °C och rå+höjd **1,65 °C** — höjden återvinner exakt
  ingenting totalt, och gör det sämre i banden 7–15 km (5,21 → 5,34) och > 20 km (1,30 → 1,33).
  Den hjälper bara nära ankaret (0–7 km: 2,58 → 2,31) och i 15–20 km (1,52 → 1,38). Offsetmodellen
  slår båda överallt (1,06 °C). **Rangordningen står — men "felkartan dömer" dömer nu emot sig själv,
  se grind A i #38b.** 751 av 761 stationer fick EU-DEM-höjd.
- [ ] 🕳️ **#97 Motorns halk-regex är blind för sammansättningar — "Rimfrost", "Halkrisk"** (kodgrindens
  självtest 11/9, PR #104). Lookbehind-regexen i engine.ts:40 matchar faroordet bara när det står först i
  ordet; "Rimfrost" och "Halkrisk" passerar tysta oavsett kod. I arkivets 838 infosträngar förekommer ingen av
  dem — ingen miss i dag, men en tyst ALDRIG den dag Trafikverket skriver så. 🔒 NYCKEL: motorändring =
  vektor i tre portar + buntad skuggmotor (CLAUDE.md), och Bengts beslut: vidga ordlistan, eller låta
  kodgrinden vakta (BLINDLISTA tom utöver "fläckvis …" i varje körning, annars larm). Verify: kodgrindens
  BLINDLISTA i nästa körning; en vektor med "Rimfrost" på kod 2 som larmar i alla tre portarna om ordlistan vidgas.
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
  ⛔ **GRIND V-A FALLER — BEKRÄFTAT 12/9 MED TREDUBBELT UNDERLAG** (körning 34670516460,
  DECISIONS #104; första domen #69, 4/9). 0–10 km vid 0,5 mm/h: **träff 61 ± 2 %** mot kravets
  70 %, falsklarm 12 ± 1 % mot kravets 25 %. n = 3 594 mot 1 141 i första körningen, och talen
  är oförändrade. Ett nej som inte rör sig när underlaget tredubblas är ett riktigt nej.
  🔍 **FALSKLARMEN ÄR INTE PROBLEMET — TRÄFFEN ÄR DET.** Falsklarm 4–12 % på varje tröskel, långt
  under kravet. Träff + delvis är 88 % vid 0,5 mm/h och 94 % vid 4 mm/h: grannarna vet med hög
  säkerhet ATT det regnar hos målstationen, men inte HUR MYCKET.
  ❗ **OCH DET ÄR PRECIS DÄRFÖR FARAN ÄR SVÅR:** intensiteten är exakt det vattenplaning behöver —
  duggregn ger ingen vattenplaning. #69:s öppna fråga (ska V-A1 skrivas om till "regnar det
  alls"?) besvaras därmed NEJ på sakliga grunder: det hade gjort påståendet mätbart och samtidigt
  värdelöst för faran. **Stationsspåret kan inte bära en intensitetsvarning.**
  🛰️ **RADARDOMENS UNDERLAG FÖRNYAT 12/9** (körning 34670799228). Cellmätningen hade också bara
  EN skarp körning — 3/9, på ett dygns radardata — och dess måndagskörning 7/9 föll i samma
  minutkris. Domen hade alltså vilat på nio dygn gammalt underlag. Nu kört med de sju dygn kortet
  #43 kräver: **14 583 radar↔station-par, 88 kompositer, 5/9 → 12/9.**
  📈 Bekräftelsen VÄXER MONOTONT med intensiteten — kurvans egen rimlighetskontroll, och den
  passerar: 39 % (0,1–0,5 mm/h) → 54 % (0,5–2) → 73 % (2–10) → **79 % (≥ 10)**.
  🎯 Missriktningen: av 14 511 stationsregn vid samplad komposittid hade radarn en rad ≤ 5 km i
  **93 %**. Jämför grind V-A:s 61 % station-mot-station. Kalibreringen (Marshall–Palmer /
  station) median **0,66** över 8 198 par, mot 0,39 på det tunna underlaget i #42.
  ⚠️ **KEDJEBEVIS, INGEN DOM** — skriptet säger det självt. Domen är Bengts och Axels på söndag.
  ➡️ Hela kortet vilar nu på **radardomen 14/9**, precis som DECISIONS #60 förutsåg: radarn mäter
  intensitet RUMSLIGT, stationerna blir kalibrering + fartgrind. Faller domen väl ut gäller #81:s
  ordning A–F. Faller den illa står #42 utan trigger.
  🐛 **OCH ETT TYST FEL, funnet 12/9:** #69 sade att kurvan skulle köras om av måndagsknappen när
  höstregnen fyllt arkivet. Den schemalagda körningen **7/9 13:31 fallerade** — tillsammans med
  ingest-fi, ingest-no, publish-map och regn-30 samma dygn, alltså minutkrisen 5/9 och inte ett
  kodfel. Ingen märkte det på fem dygn, och domen låg på fel underlag i åtta. Se kort #101.
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
  🔁 **GRIND V-A OMKÖRD 13/9 01:06 (färsk, 30 dygn, 755 stationer, 73 194 bucketade avläsningar).**
  Kravet ur TROSKLAR-VATTENPLANING §3: V-A1 träff ≥ 70 %, V-A2 falsklarm ≤ 25 %, bara 0–10 km (V-A3).
  `0,5 mm/h  n=3800  träff 60±2 %  delvis 28 %  falsklarm 12±1 %`
  `1         n=2578  träff 53±2 %  delvis 37 %  falsklarm 10±1 %`
  `2         n=1295  träff 40±3 %  delvis 51 %  falsklarm  9±2 %`
  `4         n= 513  träff 27±4 %  delvis 65 %  falsklarm  7±2 %`
  `6         n= 216  träff 20±5 %  delvis 75 %  falsklarm  5±3 %`
  `10        n=  53  träff 11±9 %  delvis 83 %  falsklarm  6±6 %`
  **DOM: V-A FALLER på alla sex trösklarna.** Tredje körningen med samma svar, nu på växande underlag
  (1 141 → 3 594 → 3 800 fall i 0–10 km). Falsklarmen klarar V-A2 överallt (5–12 %); det är TRÄFFEN som
  fäller, och delvis-andelen växer monotont med tröskeln (28 → 83 %). Grannarna vet ATT det regnar, inte
  HUR MYCKET. ⇒ Beslutsläge (a)/(b)/(c) oförändrat i sak, men (c) har nu mätt underlag: se #43 13/9.
  ✅ **BESLUTSLÄGET AVGJORT 13/9 — (c) VALT AV BENGT** (DECISIONS #153): radarn ger intensiteten
  stationerna inte kan. (a) hade kastat en källa som mäter just det som fattas; (b) avvisades redan
  12/9 på saklig grund — "regnar det alls" hade gjort påståendet mätbart och samtidigt värdelöst för
  faran. Kortet går därmed vidare enligt kort #81:s stegordning A→F, och steg A (kalibreringen in i
  dokumentet) är skrivet. 🔑 Axels kontrasignering i §3.4 innan steg B.
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

---

## 🟡 GÖRA (pågår just nu)


---

## 🟢 KLART (senaste vinsterna)

- [x] ✅ **#150 KÄLLVAKTSPÅMINNELSEN — KLART 12/9** (DECISIONS #150): vakthundens check 7. Bengts fråga *"hur får vi veta att vi ska agera"* hade ett svar med noll golv: källvakten skapar ett issue, GitHub skickar notisen, och där slutade det. **Uppmätt: issue #165 låg elva timmar utan påminnelse, källvaktens enda schemalagda körning någonsin (7/9) misslyckades och det märktes inte på fem dygn, och vakthunden nämnde inte `trv-nyhet` med ett ord.** Nu: frist 24 h för 🔴 RÖR OSS, 72 h för 🟡 VET INTE och obedömda, och **⚪ RÖR OSS INTE larmar aldrig** — en vakt som inte kan tystna blir ignorerad. Påminnelsen lyfter bedömningens `Brister:`-rader så man ser vad som står på spel utan att öppna något. Egen etikett, egen cykel, färgar aldrig driftvakthunden röd. **Löser INTE veckotakten** — en tisdagsnyhet hittas ändå först på måndagen; daglig körning kostar debiterade minuter och är ett eget beslut.
- [x] ✅ **#149 NYHETSBEDÖMNINGEN — KLART 12/9** (DECISIONS #149): larmet svarar nu på frågan i stället för att ställa den. Varje källändring slås upp i beroendekartan, matchas mot radernas nyckelord och rubriken bär domen: 🔴 RÖR OSS · 🟡 VET INTE · ⚪ RÖR OSS INTE, med **vad som brister** utskrivet. Tre regler: bedömningen **fäller aldrig ett larm**; "rör oss inte" kräver **positivt bevis** (inga träffar ⇒ VET INTE, aldrig grönt); utan text ingen bedömning — därför sparas hash-källornas text så nästa ändring kan **diffas**. 18 tester, varav fem mot **ordagranna verkliga poster**: PMP3-avvecklingen, två Mesan-poster och BanInfo blir ⚪, men "Uppdaterad portal för API-dokumentation" blir 🟡 — den vägrar gissa. Skarp körning gav samma svar på BanInfo i verkligheten. Kartan flyttad till `publish/beroenden.ts` som ren modul (skriptet kunde inte importeras). Driftvakt för TRV:s objekttyper mot koden — den fällde sitt eget bygge på "tring" ur `objecttype: string`. **Inte byggt, medvetet:** automatiskt genomförande av uppdateringen. Att låta en nyhetstext utlösa en kodändring utan läst diff är inte samma sak som att säga ok till en bedömning. **KALIBRERAD mot 31 verkliga poster före merge (#149 b):** torrkörningen hittade två fel i mitt eget bygge — nyckelordet "öppna data" matchade kanalens NAMN och gav två falska röda, och `includes` gjorde att "api" träffade *rapid* och "cap" träffade *kapacitet*. Rättat till lookbehind på ordbörjan (motorns mönster). Efter rättningen: **0 falska röda**, 19 gula, 12 vita.
- [x] ✅ **#148 KÄLLVAKTEN BREDDAD — KLART 12/9** (DECISIONS #148): sju källor ⇒ **tretton**, och därmed **9 av 9 produktionsberoenden** bevakade (var 1 av 9). Nya: `smhi-uppdateringar` (RSS, 7 poster), `fi-digitraffic`, `no-vegvesen`, `dk-dmi`, `polisen-regler`, `polisen-api` — varje hash-kandidat hämtad **två gånger före inkoppling**, alla stabila. **FYND: SMHI bevakades på fel sida** — vi läste dokumentationssajtens sitemap, men ändringarna annonseras på www.smhi.se, som har egen RSS. De tre senaste posterna lästa för hand: alla rör prognoser/analyser (PMP3, Mesan), **ingen rör metobs/radar/varningar** — vi var inte drabbade, men hade inte vetat. **FYND: DMI:s gamla dokumentation svarar 404 på varje sökväg**, dmiapi.govcloud.dk 503; vår dk-ingest skrevs 31/8, efter pensioneringen 30/6, så vi klarade migreringen genom att komma in efteråt. **FYND: user-agent saknades** i källvaktens egna hämtningar (polisens villkor ger 403) — rättat. **FYND: beroendekartan fällde sitt eget bygge** på fyra odeklarerade signalvärdar. Kvar: den maskinella bedömningen — larmet säger fortfarande "Bedöm: rör det våra källor?".
- [x] ✅ **#147 BEROENDEKARTAN — KLART 12/9** (DECISIONS #147): `scripts/beroendekartan.ts` som eget CI-steg. Läser alla externa värdar **ur koden** och fäller om något hämtas som inte står i kartan (mutationsprov: påhittad värd ⇒ exit 1). **23 externa värdar, 9 produktionsberoenden — 1 bevisat bevakat.** Källvakten (#31) bevakar sju källor, men listan valdes i augusti och följde inte med när radar, moln, FI, NO, DK och polisen tillkom. Två fynd: SMHI-täckningen är **indirekt och oprövad** (vi bevakar dokumentationssajten, hämtar från tre andra värdar), och tre av sju bevakade är omvärld, inte beroenden. Nästa steg: hitta riktiga ändringssignaler för de fem utan signal (FI, NO, DK×2, polisen).
- [x] ✅ **#145 CRLF-GLAPPET STÄNGT — KLART 12/9** (DECISIONS #145): `.gitattributes` med `* text=auto eol=lf`. `bundle-skuggmotor --check` och `bundle-publicera --check` föll ALLTID lokalt på Windows och gick ALLTID igenom i CI — git lagrar LF, Git for Windows sätter `core.autocrlf=true` i sin SYSTEM-config utan att fråga. De två kontrollerna kunde därmed aldrig användas som förkontroll före push. Uppmätt före: 364 av 411 textfiler bar CRLF lokalt. Mätt fil för fil efteråt: 363 ändrade **bara i radslut**, 0 ändrade på annat sätt, **0 binära rörda**, 0 saknade, noll blobbar i historiken ändrade. Undantag: `android/gradlew.bat` behåller CRLF. Bevis: båda bundelkontrollerna gröna lokalt, `npm test` 52/0.
- [x] ✅ **#144 KONTRAKTSGRINDEN — KLART 12/9** (DECISIONS #144, PR-länk i commiten): `scripts/kontraktsgrinden.ts` som eget CI-steg före `npm test`. Hålet: #75:s givarvakt stod ordagrant på **17 ställen i 12 filer utan någon vakt alls** — ändras 12 till 10 i en av dem mäter grindarna olika populationer tyst. Fem kontrakt vaktas (#75, fukten, `BUCKET_S` 1800, `MAX_KM` 50, `K_NEIGHBOURS` 5); alla håller redan. Fuktkontraktet jämför **över språkgränsen** (TS-mängd mot SQL-lista, normaliserad som mängd). Bevis: självtest 5 fall + två mutationsprov mot riktiga repot — `grind-t-a.ts` 12→10 ⇒ exit 1 med avvikaren utpekad, och SQL-listan utan `'dry'` ⇒ exit 1 på drift **inuti en enda fil** (rad 42 mot rad 48). Avsiktliga olikheter som INTE vaktas står i filens huvud: nollpolitiken kring #75 (motorn släpper igenom rader utan lufttemp, grindarna inte) och `MIN_SHARED` (cell-matning 10 mot grind A 20). Husregel i CLAUDE.md: en tröskel som kopieras förs in i grinden i samma commit.
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

