#!/usr/bin/env python3
"""App Store-bilder ur råa iPhone-skärmbilder (kort #280).

Ramar in 1170×2532-bilder (iPhone 14) i Apples 6,9-tumsmått 1320×2868 med appens egna tokens
(Theme.swift: bg 080B0D, gul FFC94A, text E9EFF2, dim 8FA0A9) och typsnitt (Instrument Sans,
IBM Plex Mono). Statusraden och TestFlight-brödsmulan skärs bort; skärmen får iPhone-rundade hörn
och en tunn kant. Körs: python3 marknadsforing/butik/appstore/rama.py <råbildsmapp>
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

W, H = 1320, 2868
BG, YELLOW, TEXT, DIM, STROKE = (8, 11, 13), (255, 201, 74), (233, 239, 242), (143, 160, 169), (255, 255, 255, 31)
FONTS = os.path.join(os.path.dirname(__file__), "../../../ios/HalkvaktApp/Sources/Fonts")
SCREEN_W = 1064                      # skärmens bredd på duken
CROP_TOP = 150                       # statusraden + "◀ TestFlight" (råpixlar)
RADIUS = 128                         # iPhone 14:s hörn (47 pt × 3) skalat
TOP = 590                            # var skärmen börjar

# (råfil, etikett, rubrik). Ordningen = butikens ordning.
BILDER = [
    ("99ea591b", "Varningskortet", "Gult i åtta\nsekunder.\nSedan tyst."),
    ("a479b0f3", "Vakten",        "Ett ord.\nEn knapp.\nSedan kör du."),
    ("abf993ba", "Körläget",      "Tre kameror\nframför dig.\nRösten säger till."),
    ("9e0f4ba7", "Så fungerar det", "Rösten säger till\ninnan du är där."),
    ("918d06d0", "Inställningar", "Fem källor.\nSlå av det du\ninte vill höra."),
    ("55fd6ca3", "Integritet",    "Din position\nlämnar inte\ntelefonen."),
    ("11b411bb", "Autostart",     "Vaknar själv\nnär du kör.\nStoppar själv."),
    ("8dcd46d2", "Under körning", "En kort banner\növer kartan.\nInget att trycka."),
]

def sans(size, bold=True):
    f = ImageFont.truetype(os.path.join(FONTS, "InstrumentSans.ttf"), size)
    try: f.set_variation_by_name("Bold" if bold else "Regular")
    except Exception: pass
    return f

def mono(size):
    return ImageFont.truetype(os.path.join(FONTS, "IBMPlexMono-Medium.ttf"), size)

def rama(ra, etikett, rubrik, ut):
    duk = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(duk)
    # Etikett i mono, spärrad, gul — som SectionHeader i appen.
    x, y = 110, 150
    for ch in etikett.upper():
        d.text((x, y), ch, font=mono(34), fill=YELLOW); x += d.textlength(ch, font=mono(34)) + 7
    # Rubriken: Instrument Sans bold, stor, tät radhöjd, negativ spärrning som "Redo."
    f = sans(118)
    yy = 215
    for rad in rubrik.split("\n"):
        d.text((104, yy), rad, font=f, fill=TEXT); yy += 118
    # Skärmen: skär bort statusraden, skala, runda hörnen, tunn kant.
    im = Image.open(ra).convert("RGB")
    im = im.crop((0, CROP_TOP, im.width, im.height))
    sh = round(im.height * SCREEN_W / im.width)
    im = im.resize((SCREEN_W, sh), Image.LANCZOS)
    # Luft ovanför rubriken HALKVAKT, i stället för den bortskurna statusraden.
    luft = Image.new("RGB", (SCREEN_W, sh + 44), im.getpixel((8, 8))); luft.paste(im, (0, 44)); im = luft   # skärmens egen färg (gul på kortet)
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius=RADIUS, fill=255)
    sx = (W - SCREEN_W) // 2
    duk.paste(im, (sx, TOP), mask)
    kant = Image.new("RGBA", duk.size, (0, 0, 0, 0))
    ImageDraw.Draw(kant).rounded_rectangle((sx, TOP, sx + im.width - 1, TOP + im.height - 1), radius=RADIUS, outline=STROKE, width=3)
    duk = Image.alpha_composite(duk.convert("RGBA"), kant).convert("RGB")
    duk.save(ut, "PNG", optimize=True)
    print(ut, duk.size, "skärm", im.size, "slutar vid", TOP + im.height)

if __name__ == "__main__":
    src = sys.argv[1]
    out = os.path.dirname(os.path.abspath(__file__))
    for i, (ra, etikett, rubrik) in enumerate(BILDER, 1):
        rama(os.path.join(src, f"{ra}-image.png"), etikett, rubrik,
             os.path.join(out, f"{i:02d}-{etikett.lower().replace(' ', '-').replace('å','a').replace('ä','a').replace('ö','o')}.png"))
