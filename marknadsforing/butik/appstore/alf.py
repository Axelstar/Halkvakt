#!/usr/bin/env python3
"""App Store-bilder i AppLaunchFlow-looken Axel valde 1/10 23:27 ("exactly how I want it"): växelvis gul och mörk bakgrund,
liten kicker, stor vänsterställd rubrik, telefonen i grafitram med Dynamic Island nere i bilden. Verktygets rubriker.
Ut: 1284×2778 (Apples 6,5-tumsfack, det App Store Connect visar för Halkvakt). Råbilder: iPhone 14, 1170×2532, statusraden
(översta 150 px) ersatt med skärmens egen färg så "◀ TestFlight" försvinner.
Körs: python3 marknadsforing/butik/appstore/alf.py <råbildsmapp>
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

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

def spärrad(d, x, y, text, font, fill, sparr):
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill); x += d.textlength(ch, font=font) + sparr

def statusrad(im, ljus):
    """iPhones statusrad ovanpå det tomma bandet: 9:41, signal, wifi, batteri — som på Apples egna bilder."""
    d = ImageDraw.Draw(im); c = (245, 245, 245) if not ljus else (17, 17, 17)
    d.text((88, 42), "9:41", font=sans(50), fill=c)
    x0 = im.width - 330
    for i, h in enumerate((18, 28, 38, 48)):            # signal
        d.rounded_rectangle((x0 + i * 22, 100 - h, x0 + i * 22 + 14, 100), radius=4, fill=c)
    wx = im.width - 220                                  # wifi: tre bågar + prick
    for r, w in ((44, 9), (29, 9), (14, 9)):
        d.arc((wx - r, 104 - r, wx + r, 104 + r), start=225, end=315, fill=c, width=w)
    d.ellipse((wx - 6, 96, wx + 6, 108), fill=c)
    bx = im.width - 150                                  # batteri
    d.rounded_rectangle((bx, 64, bx + 76, 100), radius=10, outline=c, width=5)
    d.rounded_rectangle((bx + 7, 71, bx + 69, 93), radius=5, fill=c)
    d.rounded_rectangle((bx + 79, 75, bx + 85, 89), radius=3, fill=c)

def rama(i, ra, kicker, rubrik, under, ut):
    gul = i % 2 == 0
    duk = Image.new("RGB", (W, H), GUL if gul else MORK)
    d = ImageDraw.Draw(duk)
    text = SVART if gul else VIT
    y = 150
    if kicker:
        spärrad(d, M, y, kicker, sans(46, False), SVART if gul else GRA, 0); y += 78
    for rad in rubrik.split("\n"):
        spärrad(d, M, y, rad, sans(118), text, -4); y += 124
    if under:
        y += 26; spärrad(d, M, y, under, sans(56, False), text, 0); y += 70

    # Skärmen: statusraden bort, bandet i skärmens färg, en riktig statusrad ovanpå.
    im = Image.open(ra).convert("RGB")
    im.paste(im.getpixel((8, 160)), (0, 0, im.width, 150))
    statusrad(im, ljus=sum(im.getpixel((8, 160))) > 380)
    sw = PHONE_W - 2 * RAM; sh = round(im.height * sw / im.width)
    im = im.resize((sw, sh), Image.LANCZOS)
    sx = (W - PHONE_W) // 2; sy = y + 110

    # Skugga (mjuk, under ramen), sedan ramen i två toner: metallkant utanpå, mörk fas innanför.
    sk = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sk).rounded_rectangle((sx - 6, sy + 24, sx + PHONE_W + 6, sy + sh + 2 * RAM + 40), radius=R_RAM, fill=(0, 0, 0, 90 if gul else 140))
    sk = sk.filter(ImageFilter.GaussianBlur(34))
    duk = Image.alpha_composite(duk.convert("RGBA"), sk)
    d = ImageDraw.Draw(duk)
    kant = (122, 122, 128) if gul else (96, 96, 102)
    d.rounded_rectangle((sx, sy, sx + PHONE_W, sy + sh + 2 * RAM), radius=R_RAM, fill=kant)
    d.rounded_rectangle((sx + 5, sy + 5, sx + PHONE_W - 5, sy + sh + 2 * RAM - 5), radius=R_RAM - 5, fill=(18, 18, 20))
    d.line((sx + 140, sy + 2, sx + PHONE_W - 140, sy + 2), fill=(200, 200, 205), width=2)   # ljusreflex på överkanten
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), radius=R_SCREEN, fill=255)
    duk.paste(im, (sx + RAM, sy + RAM), mask)
    ImageDraw.Draw(duk).rounded_rectangle((W // 2 - 118, sy + RAM + 20, W // 2 + 118, sy + RAM + 88), radius=34, fill=(0, 0, 0))
    duk.convert("RGB").save(ut, "PNG", optimize=True); print(os.path.basename(ut))

if __name__ == "__main__":
    src = sys.argv[1]; out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "alf"); os.makedirs(out, exist_ok=True)
    for i, (ra, k, r, u) in enumerate(BILDER):
        rama(i, os.path.join(src, f"{ra}-image.png"), k, r, u, os.path.join(out, f"{i + 1:02d}.png"))
    bilder = [Image.open(os.path.join(out, f"{i + 1:02d}.png")) for i in range(len(BILDER))]
    tw = 300; th = round(H * tw / W)
    rad = Image.new("RGB", (tw * len(bilder) + 16 * (len(bilder) + 1), th + 32), (235, 235, 235))
    for i, b in enumerate(bilder): rad.paste(b.resize((tw, th), Image.LANCZOS), (16 + i * (tw + 16), 16))
    rad.save(os.path.join(out, "oversikt.jpg"), "JPEG", quality=88); print("oversikt.jpg")
