#!/usr/bin/env python3
"""App Store-bilder i AppLaunchFlow-looken Axel valde 1/10 23:27 ("exactly how I want it"): växelvis gul och mörk bakgrund,
liten kicker, stor vänsterställd rubrik, telefonen i grafitram med Dynamic Island nere i bilden. Verktygets rubriker.
Ut: 1284×2778 (Apples 6,5-tumsfack, det App Store Connect visar för Halkvakt). Råbilder: iPhone 14, 1170×2532, statusraden
(översta 150 px) ersatt med skärmens egen färg så "◀ TestFlight" försvinner.
Körs: python3 marknadsforing/butik/appstore/alf.py <råbildsmapp>
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

W, H = 1284, 2778
GUL, MORK = (255, 201, 74), (10, 10, 11)
SVART, VIT, GRA = (17, 17, 17), (245, 245, 245), (200, 200, 200)
GRAFIT, GRAFIT_KANT = (24, 24, 26), (64, 64, 68)
FONTS = os.path.join(os.path.dirname(__file__), "../../../ios/HalkvaktApp/Sources/Fonts")
M = 84                       # vänstermarginal
PHONE_W = 1180               # ramens bredd — nästan hela tilen, så telefonen klipps nertill som hos AppLaunchFlow
RAM = 22; R_RAM = 168; R_SCREEN = 146

# (råfil, kicker, rubrik, underrad) — AppLaunchFlows ordning och text, 1/10.
BILDER = [
    ("99ea591b", None,          "Hör om hinder\ninnan du är\ndär",      "Kör tryggare"),
    ("9e0f4ba7", "Lyssna",      "Få varningar\nutan att titta",         None),
    ("abf993ba", "Se framåt",   "Håll koll på\nvägen framför\ndig",    None),
    ("ebca26ae", "Kör vidare",  "Vakten startar\nnär du kör",           None),
    ("918d06d0", "Välj själv",  "Hör bara det\nsom är viktigt",         None),
    ("8dcd46d2", "Få en signal","Se notiser\növer\nkartappen",          None),
    ("55fd6ca3", "Kom igång",   "Tillåt plats\noch börja köra",         None),
]

def sans(size, bold=True):
    f = ImageFont.truetype(os.path.join(FONTS, "InstrumentSans.ttf"), size)
    try: f.set_variation_by_name("Bold" if bold else "Regular")
    except Exception: pass
    return f

def rama(i, ra, kicker, rubrik, under, ut):
    gul = i % 2 == 0
    duk = Image.new("RGB", (W, H), GUL if gul else MORK)
    d = ImageDraw.Draw(duk)
    text = SVART if gul else VIT
    y = 150
    if kicker:
        d.text((M, y), kicker, font=sans(46, False), fill=SVART if gul else GRA); y += 76
    for rad in rubrik.split("\n"):
        d.text((M, y), rad, font=sans(112), fill=text); y += 122
    if under:
        y += 30; d.text((M, y), under, font=sans(56, False), fill=text); y += 70
    # Telefonen: statusraden bort, skärmens egen färg i stället; ram, rundade hörn, ö. Toppen 110 px under texten.
    im = Image.open(ra).convert("RGB")
    im.paste(im.getpixel((8, 160)), (0, 0, im.width, 150))
    sw = PHONE_W - 2 * RAM; sh = round(im.height * sw / im.width)
    im = im.resize((sw, sh), Image.LANCZOS)
    sx = (W - PHONE_W) // 2; sy = y + 110
    ImageDraw.Draw(duk).rounded_rectangle((sx, sy, sx + PHONE_W, sy + sh + 2 * RAM), radius=R_RAM, fill=GRAFIT, outline=GRAFIT_KANT, width=4)
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), radius=R_SCREEN, fill=255)
    duk.paste(im, (sx + RAM, sy + RAM), mask)
    ImageDraw.Draw(duk).rounded_rectangle((W // 2 - 118, sy + RAM + 20, W // 2 + 118, sy + RAM + 88), radius=34, fill=(0, 0, 0))
    duk.save(ut, "PNG", optimize=True); print(os.path.basename(ut), "telefonen börjar", sy)

if __name__ == "__main__":
    src = sys.argv[1]; out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "alf"); os.makedirs(out, exist_ok=True)
    for i, (ra, k, r, u) in enumerate(BILDER):
        rama(i, os.path.join(src, f"{ra}-image.png"), k, r, u, os.path.join(out, f"{i + 1:02d}.png"))
    bilder = [Image.open(os.path.join(out, f"{i + 1:02d}.png")) for i in range(len(BILDER))]
    tw = 300; th = round(H * tw / W)
    rad = Image.new("RGB", (tw * len(bilder) + 16 * (len(bilder) + 1), th + 32), (235, 235, 235))
    for i, b in enumerate(bilder): rad.paste(b.resize((tw, th), Image.LANCZOS), (16 + i * (tw + 16), 16))
    rad.save(os.path.join(out, "oversikt.jpg"), "JPEG", quality=88); print("oversikt.jpg")
