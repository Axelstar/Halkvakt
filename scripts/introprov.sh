#!/usr/bin/env bash
# Introduktionens sidovägar på en emulator (kort #652; android.yml, jobbet introprov). Fyra vägar från en nollställd app:
# K (inte nu), L (självstart men inte "hela tiden"), M (ungefärlig plats) och N (tillåt inte). Emulatorn ställs på svenska,
# och texten i varje ruta från Android skrivs ut, så att introduktionens knappnamn går att stämma av mot systemets.
# Trycker på text (uiautomator), som demovideo.sh. Ett steg som saknas skriver MISSING och provet faller på slutet.
set -u
mkdir -p /tmp/introprov
APK=android/app/build/outputs/apk/debug/app-debug.apk
PKG=se.halkvakt.app
FEL=0
adb root >/dev/null 2>&1; sleep 2
adb shell "setprop persist.sys.locale sv-SE; setprop ctl.restart zygote" >/dev/null 2>&1
sleep 25; adb wait-for-device; until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 2; done; sleep 8
echo "locale: $(adb shell getprop persist.sys.locale | tr -d '\r')"
adb shell wm size 1080x2340; adb shell wm density 420
adb install -r "$APK"

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
# every text on the screen that does not belong to the app: what Android's own dialog says
systemtext() { dump; python3 - "$1" <<'P'
import re,sys,html
s=open('/tmp/u.xml',encoding='utf-8',errors='ignore').read()
ut=[]
for m in re.finditer(r'<node [^>]*>',s):
    n=m.group(0)
    if 'package="se.halkvakt.app"' in n: continue
    t=html.unescape((re.search(r' text="([^"]*)"',n) or [0,''])[1]).strip()
    if t and t not in ut: ut.append(t)
print("SYSTEMRUTA %s: %s" % (sys.argv[1], " | ".join(ut)))
P
}
tap() { for i in $(seq 1 "${2:-8}"); do dump; xy=$(find_xy "$1"); if [ -n "$xy" ]; then echo "tap '$1' @ $xy"; adb shell input tap $xy; sleep 2; return 0; fi; sleep 1; done; echo "MISSING '$1'"; FEL=$((FEL+1)); return 1; }
tap_any() { for i in 1 2 3 4 5; do for t in "$@"; do dump; xy=$(find_xy "$t"); [ -n "$xy" ] && { echo "tap '$t' @ $xy"; adb shell input tap $xy; sleep 2; return 0; }; done; sleep 1; done; echo "MISSING any of: $*"; FEL=$((FEL+1)); return 1; }
ser() { for i in 1 2 3 4 5 6; do dump; [ -n "$(find_xy "$1")" ] && { echo "ser '$1'"; return 0; }; sleep 1; done; echo "MISSING skärmen '$1'"; FEL=$((FEL+1)); return 1; }
shot() { adb exec-out screencap -p > "/tmp/introprov/$1.png"; }
ny() { adb shell pm clear $PKG >/dev/null; adb shell am start -S -W -n $PKG/.MainActivity >/dev/null; sleep 4; echo "=== väg $1"; ser "Visa mig"; }
tillplatsen() { tap "Visa mig"; tap "Nästa"; tap "Nästa"; ser "Nu slår vi på vakten"; tap "Fortsätt"; sleep 2; }
notiserna() { ser "Se varningen på skärmen"; tap "Fortsätt"; sleep 2; systemtext notiser; tap_any "Tillåt" "Allow"; ser "Notiser"; tap "Fortsätt"; }

# K: tillåter platsen, väljer "Inte nu, jag startar själv"
ny K; tillplatsen; systemtext platsen; shot K1-platsrutan
tap_any "Exakt" "Precise"; tap_any "När appen används" "While using the app"
ser "Ska vakten starta själv?"; tap "Inte nu, jag startar själv"; ser "Du startar vakten själv"; shot K2-startar-sjalv; tap "Fortsätt"
notiserna; ser "Redo när du startar"; shot K3-redo-nar-du-startar; tap "Klar"; ser "Starta vakten"; shot K4-startsidan

# L: vill ha självstart men backar från sidan utan att välja "Tillåt hela tiden"
ny L; tillplatsen; tap_any "Exakt" "Precise"; tap_any "När appen används" "While using the app"
ser "Ska vakten starta själv?"; tap "Slå på självstart"; sleep 2; systemtext aktivitet; shot L1-aktivitetsrutan
tap_any "Tillåt" "Allow"; sleep 2; systemtext enheter; shot L2-enhetsrutan; tap_any "Tillåt" "Allow"
ser "Sista frågan: hela tiden"; shot L3-hela-tiden; tap "Öppna sidan"; sleep 3; systemtext platssidan; shot L4-platssidan
adb shell input keyevent 4; sleep 3; ser "Du startar vakten själv"; shot L5-startar-sjalv; tap "Fortsätt"
notiserna; ser "Redo när du startar"; shot L6-redo-nar-du-startar

# M: väljer ungefärlig plats
ny M; tillplatsen; tap_any "Ungefärlig" "Approximate"; shot M1-ungefarlig; tap_any "När appen används" "While using the app"
ser "Exakt plats behövs"; shot M2-exakt-behovs; tap "Fortsätt utan exakt plats"
notiserna; ser "Nästan redo"; shot M3-nastan-redo; tap "Gör det senare"; ser "Starta vakten"

# N: tillåter inte platsen, och trycker sedan Starta vakten på startsidan
ny N; tillplatsen; tap_any "Tillåt inte" "Don’t allow" "Don't allow"
ser "Vakten kan inte varna"; shot N1-kan-inte-varna; tap "Fortsätt utan plats"
notiserna; ser "Nästan redo"; shot N2-nastan-redo; tap "Gör det senare"; ser "Starta vakten"; shot N3-startsidan
tap "Starta vakten"; sleep 3; shot N4-starta-utan-plats; systemtext efter-starta; dump
python3 - <<'P'
import re,html
s=open('/tmp/u.xml',encoding='utf-8',errors='ignore').read()
print("APPENS TEXT EFTER STARTA VAKTEN UTAN PLATS: " + " | ".join(dict.fromkeys(html.unescape(t) for t in re.findall(r' text="([^"]+)"',s))))
P

ls -la /tmp/introprov
echo "saknade steg: $FEL"
[ "$FEL" = "0" ]
