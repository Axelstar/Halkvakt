# Renderar designöverlämningens 3D-socklar (DECISIONS #443) till PNG @3x för iOS och Android.
# Kör: python3 scripts/design-socklar.py  (kräver playwright + chromium). CSS:en är designens, ordagrant.
import os
from playwright.sync_api import sync_playwright
os.makedirs("/tmp/plinth", exist_ok=True)
TRI="M46.64 2.68 L83.28 66.13 A5.36 5.36 0 0 1 78.64 74.17 L5.36 74.17 A5.36 5.36 0 0 1 0.72 66.13 L37.36 2.68 A5.36 5.36 0 0 1 46.64 2.68 Z M38.78 25.91 L45.22 25.91 L43.79 49.15 L40.21 49.15 Z M38.07 58.09 A3.93 3.93 0 1 0 45.93 58.09 A3.93 3.93 0 1 0 38.07 58.09 Z"
def layers(n,depth,front,mid,back,html,extra=""):
    out=""
    for i in range(n):
        z=-depth/2+depth*i/(n-1); c=front if i==n-1 else back if i==0 else mid
        out+=html.format(t=f"translateZ({z:.2f}px){extra}",c=c)
    return out
def plinth(top_inner, objects, shadow="rgba(0,0,0,.7)", top="#1A2327", left="#11181B", right="#0A0F11"):
    return f'''<div style="position:absolute;left:50%;top:62%;width:220px;height:50px;margin-left:-110px;margin-top:20px;border-radius:50%;background:{shadow};filter:blur(16px);"></div>
<div style="position:absolute;left:50%;top:62%;width:0;height:0;transform-style:preserve-3d;transform:rotateX(-30deg) rotateY(-45deg);">
 <div style="position:absolute;left:-70px;top:-70px;width:140px;height:140px;background:{top};transform:rotateX(90deg);overflow:hidden;">{top_inner}</div>
 <div style="position:absolute;left:-70px;top:0;width:140px;height:22px;background:{left};transform:translateZ(70px);"></div>
 <div style="position:absolute;left:-70px;top:0;width:140px;height:22px;background:{right};transform:rotateY(90deg) translateZ(70px);"></div>
 {objects}
</div>'''
RINGS='<div style="position:absolute;left:20px;top:20px;width:100px;height:100px;border-radius:50%;border:1.5px solid #34424A;box-sizing:border-box;"></div><div style="position:absolute;left:4px;top:4px;width:132px;height:132px;border-radius:50%;border:1.5px solid #26323A;box-sizing:border-box;"></div>'
TRIL='<div style="position:absolute;left:-42px;top:-74px;width:84px;height:75px;clip-path:path(evenodd,\''+TRI+'\');background:{c};transform:{t};"></div>'
logo=plinth(RINGS, layers(16,22,'#FFC94A','#C8962C','#9C7420',TRIL))
def pin(r1,r2,cols):
    inner=f'<div style="position:absolute;left:35px;top:35px;width:70px;height:70px;border-radius:50%;border:2px solid {r1};box-sizing:border-box;"></div><div style="position:absolute;left:12px;top:12px;width:116px;height:116px;border-radius:50%;border:1.5px solid {r2};box-sizing:border-box;"></div>'
    PINL='<div style="position:absolute;left:-26px;top:-70px;width:52px;height:52px;border-radius:50% 50% 50% 0;background:{c};transform:{t};"></div>'
    obj=layers(12,14,*cols,PINL,' rotate(-45deg)')+'<div style="position:absolute;left:-10px;top:-54px;width:20px;height:20px;border-radius:50%;background:#080B0D;transform:translateZ(8px);"></div>'
    return plinth(inner,obj)
PIN=('#E9EFF2','#9AA6AC','#76838A'); PINGREY=('#4A5A63','#323E44','#283237')
MAP='<div style="position:absolute;left:0;right:0;top:58px;height:10px;background:#26323A;"></div><div style="position:absolute;top:0;bottom:0;left:84px;width:10px;background:#26323A;"></div><div style="position:absolute;left:30px;top:0;bottom:0;width:4px;background:#202B30;"></div><div style="position:absolute;left:83px;top:57px;width:12px;height:12px;border-radius:50%;background:#E9EFF2;"></div>'
scenes={
 "plinth-logo":logo,
 "plinth-pin":pin('#34424A','#26323A',PIN),
 "plinth-pin-always":pin('#1FB25A','#167F41',PIN),
 "plinth-pin-whenonly":pin('#4A5A63','#26323A',PIN),
 "plinth-pin-denied":pin('#34424A','#26323A',PINGREY),
 "plinth-map":plinth(MAP,""),
}
W,H=300,240
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':W,'height':H},device_scale_factor=3)
    for name,html in scenes.items():
        pg.set_content(f'<html><body style="margin:0;background:transparent"><div style="position:relative;width:{W}px;height:{H}px;overflow:hidden">{html}</div></body></html>')
        pg.screenshot(path=f"/tmp/plinth/{name}.png",omit_background=True)   # kopieras sedan till Assets.xcassets och drawable-xxhdpi
    b.close()
print("ok")
