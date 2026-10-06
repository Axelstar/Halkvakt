# Play-dossier: bakgrundsplats (ACCESS_BACKGROUND_LOCATION)

Google kräver en deklaration + demovideo för appar som begär "Tillåt hela tiden".
Detta är underlaget som klistras in i Play Console vid inlämning (Fas 4).

## Deklarationstext (sv → en lämnas i konsolen på engelska)

**EN (till konsolen):**
"Halkvakt is a road-safety app that warns drivers by voice about slippery roads,
accidents, wildlife and speed cameras ahead. Its core feature is hands-free operation:
the guard starts automatically when driving begins (activity recognition / car
Bluetooth) and must then read the phone's location to know what lies on the road
ahead. Background location is used ONLY while the user is driving with the guard
active, shown persistently in a foreground-service notification. Location is never
sent automatically: all hazard matching happens on-phone against a downloaded
snapshot, and no position, route or trip is transmitted, stored or shared. The one
exception is opt-in and manual: beta testers who turn on "Betatest" (off by default)
can press a button to say whether a warning was right, or mark afterwards that the app
missed something. Each press sends the warning id or nearest weather-station id, a
timestamp and the answer — which reveals roughly where and when — with no account,
device id or IP stored. This is disclosed in the privacy policy and Data safety form."

## Demovideo-manus (spelas in på testmobilen, ~30 s, Fas 4)
1. Visa autostart-knappen slås PÅ + behörighetsstegen ("Tillåt hela tiden").
2. Lägg telefonen åt sidan; starta bilen → notisen "Halkvakt vaktar" dyker upp själv.
3. Kör förbi en fartkamera → rösten varnar (skärminspelning med ljud).
4. Stanna, kliv ur → vakten stängs av själv; notisen försvinner.

## Policyfakta som gör oss godkännbara
- Foreground service med typ `location` + permanent notis medan platsen läses.
- Positionen skickas aldrig automatiskt. Nätanropen är GET av snapshot/manifest från GitHub Pages, plus —
  bara med Betatest påslagen och bara vid förarens eget tryck — facitsvaret och missen (varnings-id eller
  närmaste station + klockslag + svaret; CLAUDE.md:s invariant, DECISIONS #264/#379). Rättat 4/10: texten
  sade "No location data is transmitted" och "enda nätanrop är GET", osant sedan 16/9 — samma fel som #214
  rättade i Data safety och `integritet.html`, men den här filen missades.
- Funktionen är kärnvärdet (förares säkerhet), inte annons/analys — kategori som
  uttryckligen tillåts i policyn för bakgrundsplats.
- Utan "Tillåt hela tiden" fungerar appen fortfarande manuellt (while-in-use).
