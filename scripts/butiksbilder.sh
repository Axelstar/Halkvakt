#!/usr/bin/env bash
# Råbilder till Play-butikens skärmbilder (android.yml, jobbet butiksbilder; ramas in av marknadsforing/butik/play/play.py).
# Samma skärmar som App Store-bilderna, tagna ur Android-appen i full upplösning. Favoriterna kommer ur fotostudions krok
# med påhittade vägar, aldrig en riktig resa. Trycker på text (uiautomator), som demovideo.sh.
set -u
mkdir -p /tmp/butik
APK=android/app/build/outputs/apk/debug/app-debug.apk
PKG=se.halkvakt.app
adb shell settings put system screen_off_timeout 600000
adb install -r "$APK"
adb emu geo fix 18.0686 59.3293
adb shell settings put global sysui_demo_allowed 1   # ren statusrad: 12:00, fullt batteri, inga notisikoner
adb shell am broadcast -a com.android.systemui.demo -e command enter >/dev/null
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941 >/dev/null
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false >/dev/null
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false >/dev/null

dump() { adb shell uiautomator dump /sdcard/u.xml >/dev/null 2>&1; adb shell cat /sdcard/u.xml > /tmp/u.xml 2>/dev/null; }
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
tap() { for i in $(seq 1 "${2:-8}"); do dump; xy=$(find_xy "$1"); if [ -n "$xy" ]; then echo "tap '$1' @ $xy"; adb shell input tap $xy; sleep 2; return 0; fi; sleep 1; done; echo "MISSING '$1'"; return 1; }
tap_any() { for i in 1 2 3 4 5; do for t in "$@"; do dump; xy=$(find_xy "$t"); [ -n "$xy" ] && { echo "tap '$t' @ $xy"; adb shell input tap $xy; sleep 2; return 0; }; done; sleep 1; done; echo "MISSING any of: $*"; return 1; }
shot() { adb exec-out screencap -p > "/tmp/butik/$1.png"; echo "bild $1"; }

# Introduktionen på en nollställd app: varningarna, så märks en varning, och frågan om platsen.
adb shell pm clear $PKG >/dev/null
adb shell am start -S -W -n $PKG/.MainActivity --ei fotostudio_intro 1 >/dev/null; sleep 5; shot intro-varningarna
adb shell am start -S -W -n $PKG/.MainActivity --ei fotostudio_intro 2 >/dev/null; sleep 5; shot intro-marks
adb shell am start -S -W -n $PKG/.MainActivity --ei fotostudio_intro 3 >/dev/null; sleep 5; shot intro-platsen

# Vakten: startsidan, körläget och provkortet (långt tryck på PÅ VAKT, som granskarna gör).
adb shell pm grant $PKG android.permission.ACCESS_FINE_LOCATION
adb shell pm grant $PKG android.permission.POST_NOTIFICATIONS 2>/dev/null || true
adb shell am start -S -W -n $PKG/.MainActivity >/dev/null; sleep 8; shot redo
tap "Starta vakten"; tap_any "Fortsätt" "Tillåt" "Allow" 2; sleep 8; shot pa-vakt
dump; xy=$(find_xy "PÅ VAKT"); echo "långt tryck @ $xy"; [ -n "$xy" ] && adb shell input swipe $xy $xy 900; sleep 2; shot varningskortet; sleep 8
tap "Avsluta vakten"; sleep 3

# Favoriterna och rapporten (fotostudions krok: påhittade vägar), och Varna för.
adb shell am start -S -W -n $PKG/.MainActivity --ez fotostudio_favoriter true >/dev/null; sleep 8; shot spara-resan
tap "FAVORITER"; sleep 12; shot favoriter
tap "Jobbet"; sleep 12; shot rapporten
adb shell input keyevent 4; sleep 2
tap "INSTÄLLNINGAR"; tap "Varna för"; sleep 2; shot varna-for
ls -la /tmp/butik
