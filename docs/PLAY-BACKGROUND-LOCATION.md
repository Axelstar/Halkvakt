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
active, shown persistently in a foreground-service notification. Location never
leaves the device: all hazard matching happens on-phone against a downloaded
snapshot. No location data is transmitted, stored or shared."

## Demovideo-manus (spelas in på testmobilen, ~30 s, Fas 4)
1. Visa autostart-knappen slås PÅ + behörighetsstegen ("Tillåt hela tiden").
2. Lägg telefonen åt sidan; starta bilen → notisen "Halkvakt vaktar" dyker upp själv.
3. Kör förbi en fartkamera → rösten varnar (skärminspelning med ljud).
4. Stanna, kliv ur → vakten stängs av själv; notisen försvinner.

## Policyfakta som gör oss godkännbara
- Foreground service med typ `location` + permanent notis medan platsen läses.
- Positionen lämnar aldrig enheten (ingen nätverkssändning av plats — verifierbart:
  appens enda nätanrop är GET av snapshot/manifest från GitHub Pages).
- Funktionen är kärnvärdet (förares säkerhet), inte annons/analys — kategori som
  uttryckligen tillåts i policyn för bakgrundsplats.
- Utan "Tillåt hela tiden" fungerar appen fortfarande manuellt (while-in-use).
