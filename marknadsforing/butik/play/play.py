#!/usr/bin/env python3
"""Play-butikens skärmbilder i samma look som App Store-bilderna (appstore/alf.py, Axels val 1/10): växelvis gul och mörk
bakgrund, liten kicker, stor vänsterställd rubrik, telefonen nere i bilden. Här en Android-telefon: rakare hörn och ett
kamerahål i stället för Dynamic Island. Ut: 1080×2160 (Plays tak är sidförhållandet 2:1).
Råbilder: android-flödets jobb butiksbilder (scripts/butiksbilder.sh), tagna ur Android-appen på en emulator.
Körs: python3 marknadsforing/butik/play/play.py <råbildsmapp>
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 2160
GUL, MORK = (255, 201, 74), (10, 10, 11)
SVART, VIT, GRA = (17, 17, 17), (245, 245, 245), (200, 200, 200)
FONTS = os.path.join(os.path.dirname(__file__), "../../../ios/HalkvaktApp/Sources/Fonts")
M = 70
PHONE_W = 960
RAM = 16; R_RAM = 84; R_SCREEN = 70

# (råfil, kicker, rubrik, underrad). Rubrikerna på 1, 2, 4, 5, 6 och 8 är App Store-bildernas; 3 och 7 är nya 14/11.
BILDER = [
    ("varningskortet",   None,            "Hör om hinder\ninnan du är\ndär",   "Kör tryggare"),
    ("pa-vakt",          "Lyssna",        "Få varningar\nutan att titta",      None),
    ("intro-varningarna","Fem varningar", "Halka, kameror,\nvilt och mer",     None),
    ("favoriter",        "Nytt",          "Spara vägar\ndu kör ofta",          None),
    ("rapporten",        "Före resan",    "Se läget\nlängs vägen",             None),
    ("varna-for",        "Välj själv",    "Hör bara det\nsom är viktigt",      None),
    ("intro-marks",      "Så märks det",  "Rösten säger\ntill först",          None),
    ("intro-platsen",    "Kom igång",     "Tillåt plats\noch börja köra",      None),
]

def sans(size, bold=True):
    f = ImageFont.truetype(os.path.join(FONTS, "InstrumentSans.ttf"), size)
    try: f.set_variation_by_name("Bold" if bold else "Regular")
    except Exception: pass
    return f

def sparrad(d, x, y, text, font, fill, sparr):
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill); x += d.textlength(ch, font=font) + sparr

def rama(i, ra, kicker, rubrik, under, ut):
    gul = i % 2 == 0
    duk = Image.new("RGB", (W, H), GUL if gul else MORK)
    d = ImageDraw.Draw(duk)
    text = SVART if gul else VIT
    y = 120
    if kicker:
        sparrad(d, M, y, kicker, sans(39, False), SVART if gul else GRA, 0); y += 66
    for rad in rubrik.split("\n"):
        sparrad(d, M, y, rad, sans(99), text, -3); y += 104
    if under:
        y += 22; sparrad(d, M, y, under, sans(47, False), text, 0); y += 60

    im = Image.open(ra).convert("RGB")
    sw = PHONE_W - 2 * RAM; sh = round(im.height * sw / im.width)
    im = im.resize((sw, sh), Image.LANCZOS)
    sx = (W - PHONE_W) // 2; sy = y + 90

    sk = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sk).rounded_rectangle((sx - 5, sy + 20, sx + PHONE_W + 5, sy + sh + 2 * RAM + 34), radius=R_RAM, fill=(0, 0, 0, 90 if gul else 140))
    sk = sk.filter(ImageFilter.GaussianBlur(28))
    duk = Image.alpha_composite(duk.convert("RGBA"), sk)
    d = ImageDraw.Draw(duk)
    kant = (122, 122, 128) if gul else (96, 96, 102)
    d.rounded_rectangle((sx, sy, sx + PHONE_W, sy + sh + 2 * RAM), radius=R_RAM, fill=kant)
    d.rounded_rectangle((sx + 4, sy + 4, sx + PHONE_W - 4, sy + sh + 2 * RAM - 4), radius=R_RAM - 4, fill=(18, 18, 20))
    d.line((sx + 110, sy + 2, sx + PHONE_W - 110, sy + 2), fill=(200, 200, 205), width=2)
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), radius=R_SCREEN, fill=255)
    duk.paste(im, (sx + RAM, sy + RAM), mask)
    ImageDraw.Draw(duk).ellipse((W // 2 - 17, sy + RAM + 20, W // 2 + 17, sy + RAM + 54), fill=(0, 0, 0))   # kamerahålet
    duk.convert("RGB").save(ut, "PNG", optimize=True); print(os.path.basename(ut))

if __name__ == "__main__":
    src = sys.argv[1]; out = os.path.dirname(os.path.abspath(__file__))
    for i, (ra, k, r, u) in enumerate(BILDER):
        rama(i, os.path.join(src, f"{ra}.png"), k, r, u, os.path.join(out, f"{i + 1:02d}.png"))
    bilder = [Image.open(os.path.join(out, f"{i + 1:02d}.png")) for i in range(len(BILDER))]
    tw = 300; th = round(H * tw / W)
    rad = Image.new("RGB", (tw * len(bilder) + 16 * (len(bilder) + 1), th + 32), (235, 235, 235))
    for i, b in enumerate(bilder): rad.paste(b.resize((tw, th), Image.LANCZOS), (16 + i * (tw + 16), 16))
    rad.save(os.path.join(out, "oversikt.jpg"), "JPEG", quality=88); print("oversikt.jpg")
