#!/usr/bin/env bash
# Play-deklarationens demovideo (android.yml, jobbet demovideo). Trycker på knappar efter deras TEXT (uiautomator),
# inte efter koordinater — samma skript håller när layouten flyttar sig. Varje steg skriver sin rad i loggen.
set -u
mkdir -p /tmp/demo
APK=android/app/build/outputs/apk/debug/app-debug.apk
adb shell wm size 1080x2340; adb shell wm density 420   # uiautomator's bounds follow the override, so the taps do too
adb shell settings put system screen_off_timeout 600000
adb shell locksettings set-disabled false >/dev/null 2>&1 || true
adb install -r "$APK"
adb emu geo fix 18.0686 59.3293   # Stockholm

dump() { adb shell uiautomator dump /sdcard/u.xml >/dev/null 2>&1; adb shell cat /sdcard/u.xml > /tmp/u.xml 2>/dev/null; }
# center of the first node whose text or content-desc equals $1 (case-insensitive)
find_xy() { python3 - "$1" <<'P'
import re,sys,html
want=sys.argv[1].lower()
s=open('/tmp/u.xml',encoding='utf-8',errors='ignore').read()
for m in re.finditer(r'<node [^>]*>',s):
    n=m.group(0)
    t=html.unescape((re.search(r' text="([^"]*)"',n) or [0,''])[1]).lower()
    d=html.unescape((re.search(r'content-desc="([^"]*)"',n) or [0,''])[1]).lower()
    if want in (t,d):
        a,b,c,e=map(int,re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',n).groups())
        print((a+c)//2,(b+e)//2); break
P
}
# center of the first checkable node (the Compose Switch) — the row text is not what toggles it
find_switch() { python3 - <<'P'
import re
s=open('/tmp/u.xml',encoding='utf-8',errors='ignore').read()
for m in re.finditer(r'<node [^>]*checkable="true"[^>]*>',s):
    a,b,c,e=map(int,re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',m.group(0)).groups())
    print((a+c)//2,(b+e)//2); break
P
}
tap() {  # tap <text> [tries]
  for i in $(seq 1 "${2:-10}"); do dump; xy=$(find_xy "$1"); if [ -n "$xy" ]; then echo "tap '$1' @ $xy"; adb shell input tap $xy; sleep 2; return 0; fi; sleep 1; done
  echo "MISSING '$1'"; return 1
}
tap_any() { for t in "$@"; do dump; xy=$(find_xy "$t"); [ -n "$xy" ] && { echo "tap '$t' @ $xy"; adb shell input tap $xy; sleep 2; return 0; }; done; echo "MISSING any of: $*"; return 1; }
shot() { adb exec-out screencap -p > "/tmp/demo/$1.png"; }

adb shell screenrecord --time-limit 180 --bit-rate 6000000 /sdcard/demo.mp4 &
REC=$!
sleep 2
adb shell am start -W -n se.halkvakt.app/.MainActivity; sleep 4; shot 01-valkommen

# 1. The introduction (kort #652): every screen before an Android dialog is the explanation, and says which choice to make.
#    Location in the foreground first, then self-start (activity recognition, car Bluetooth) and, as its own step,
#    background location on the system page ("Allow all the time").
tap "Visa mig"; shot 02-varningarna; tap "Nästa"; shot 03-sa-marks-en-varning; tap "Nästa"
sleep 2; shot 04-forklaring-platsen; sleep 3; tap "Fortsätt"
tap_any "Precise" "Exakt"; shot 05-platsruta; tap_any "While using the app" "När appen används"
sleep 2; shot 06-forklaring-sjalvstart; sleep 3; tap "Slå på självstart"
tap_any "Allow" "Tillåt"; tap_any "Allow" "Tillåt" 3
sleep 2; shot 07-forklaring-hela-tiden; sleep 4; tap "Öppna sidan"
sleep 3; tap_any "Allow all the time" "Tillåt hela tiden"; shot 08-tillat-hela-tiden; sleep 2
adb shell input keyevent 4; sleep 3; shot 09-sjalvstarten-pa; sleep 2; tap "Fortsätt"
sleep 2; shot 10-forklaring-notiser; sleep 2; tap "Fortsätt"; tap_any "Allow" "Tillåt" 3
sleep 2; shot 11-notiser-pa; tap "Fortsätt"
sleep 2; shot 12-vakten-ar-redo; sleep 2; tap "Klar"; sleep 3; shot 13-redo
adb shell am start -n se.halkvakt.app/.MainActivity; sleep 3   # back in the app whatever the back press did

# 2. The guard: foreground service with its notification, also on the lock screen.
tap "VAKTEN"; tap "Starta vakten"; tap_any "Allow" "Tillåt" 3
sleep 6; shot 14-pa-vakt
adb shell cmd statusbar expand-notifications; sleep 4; shot 15-notisen; adb shell cmd statusbar collapse; sleep 2
adb shell input keyevent 26; sleep 2; adb shell input keyevent 224; sleep 4; shot 16-lasskarmen
adb shell wm dismiss-keyguard; adb shell input keyevent 82; sleep 3

# 3. The sample card (long-press "På vakt"), then stop: the notification goes away.
dump; xy=$(find_xy "PÅ VAKT"); echo "long-press @ $xy"; [ -n "$xy" ] && adb shell input swipe $xy $xy 900; sleep 3; shot 17-provkortet; sleep 6
# Stop from the notification itself (Å1, kort #262) — then the shade shows it gone.
adb shell cmd statusbar expand-notifications; sleep 3; tap "Avsluta vakten"; sleep 2
adb shell cmd statusbar expand-notifications; sleep 4; shot 18-notisen-borta; adb shell cmd statusbar collapse; sleep 2

adb shell pkill -INT screenrecord; wait $REC; sleep 3
adb pull /sdcard/demo.mp4 /tmp/demo/demo-raw.mp4
ls -la /tmp/demo
