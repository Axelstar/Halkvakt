# Soffprovet på Android-emulatorn

Det här provet ersätter bilprovet i steg 4 av provet i drift (DECISIONS #578 och #596, kort #343 steg 13) inför App Review. Det
riktiga bilprovet görs senare, när det blir kallt i Skåne, som bekräftelse i fält.

Provet visar två saker. Kandidatens betavarning hörs med riktiga data: appen läser den riktiga lägesfilen, och emulatorn kör en
påhittad bil genom en sträcka där kandidaten varnar just då. Brytaren tystar den sedan.

Det bevisar inte tre saker:
- riktig GPS i rörelse;
- att appen startar själv via Bluetooth;
- ljudet i bilens högtalare.

## En gång: emulatorn

1. Installera **Android Studio** från developer.android.com/studio.
2. Skapa en emulator i **Device Manager** → **Create virtual device**:
   - Välj en telefon med Play-ikonen, till exempel Pixel 8.
   - Välj systemavbilden **API 35 med Google Play**. Appens position kommer från Googles platstjänst, så en avbild utan Google
     fungerar inte.
   - Avsluta med **Finish** och tryck sedan ▶.
3. Installera en svensk röst i emulatorn:
   - Gå till **Inställningar → System → Språk → Text till tal → Googles talmotor** och installera röstdata för **svenska**.
   - Utan svensk röst talar appen engelska (`skills/halkvakt-android/SKILL.md` §4).
4. Hämta och installera appen:
   - Hämta APK:n: GitHub → Actions → körningen
     [38866813325](https://github.com/Axelstar/Halkvakt/actions/runs/38866813325) (android på bd58e36, 0.3.13 (26)) → artefakten
     **halkvakt-debug-apk** (9,6 MB, en zip).
   - Packa upp zipen och dra `app-debug.apk` till emulatorfönstret.
5. Öppna Halkvakt i emulatorn:
   - Ge appen tillåtelse att använda platsen och att visa notiser.
   - Låt introduktionen gå klart.

## Varje prov: en kall morgon

Kandidaten varnar bara där det är kallt och fuktigt, och just nu är det oftast i norr nattetid och tidigt på morgonen.

1. **Rutten.** Kör `node --experimental-strip-types scripts/kandidat-gpx.ts` i repot, eller be Claude om filen.
   - Skriptet läser lägesfilen just då, väljer sträckan med flest varnande punkter och skriver `soffprovet.gpx`.
   - Rutten går i 80 km/h och börjar med 3 km inkörning.
   - Varnar kandidaten ingenstans vägrar skriptet. Försök då igen senare.
2. **Starta vakten** i appen och skruva upp ljudet.
3. **Spela rutten:**
   - Öppna emulatorns sidomeny (**⋯**, *Extended controls*) och välj **Location**.
   - Välj **Load GPX/KML** och sedan `soffprovet.gpx`.
   - Ställ hastigheten på **1x** och tryck **Play route**.
4. **Förväntan A:** inom fem minuter säger appen *"Halkvakt tror: halka framöver."* och visar betakortet. Om rösten inte hörs, eller
   kortet saknas, ta en skärmbild.
5. **Steg 4 — tysta** (#578):
   - Säg *"tysta"* till Claude. Claude trycker kandidatbrytaren och bekräftar när lägesfilen saknar nyckeln. Det tar högst 10
     minuter.
   - **Stoppa och starta vakten.** Appen hämtar lägesfilen när vakten startar och sedan var 30:e minut.
   - Spela rutten från början.
6. **Förväntan B:** appen säger **inte** *"Halkvakt tror …"* under 45 minuter av rutten.
7. **Starta igen:**
   - Du trycker *starta*, eller säger det till Claude.
   - Axel trycker *starta* från sitt eget konto. Brytaren räknar vem som trycker, så det kan bara Axel göra.
   - Tills båda har tryckt är kandidaten tyst för alla testare och på kartan.

Utfallet, alltså tiderna, förväntan A och B och skärmbilderna, skrivs in i DECISIONS #596 och i provet i #578.
