#!/usr/bin/env python3
"""App Store-bilder ur råa iPhone-skärmbilder (kort #280) — editorial-looken Axel valde 1/10 (Goldies mall som förebild).

1320×2868 (Apples 6,9 tum). Ljus, varm bakgrund; etikett i mono-gult och rubrik i Instrument Sans centrerade överst;
telefonen i en grafitram med Dynamic Island, så stor att den löper ut genom nederkanten. Statusraden och
TestFlight-brödsmulan skärs bort ur råbilden (iPhone 14, 1170×2532). Appens tokens: gul FFC94A, mörk 080B0D.
Körs: python3 marknadsforing/butik/appstore/rama.py <råbildsmapp>
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1320, 2868
PAPPER = (246, 240, 229)            # varm, ljus bakgrund — gult och grafit lyfter mot den
BLACK = (20, 17, 12)
YELLOW_INK = (173, 120, 0)          # appens gula, mörkad så den läses på papper
GRAFIT, GRAFIT_KANT, SVART = (28, 28, 30), (70, 70, 74), (8, 11, 13)
FONTS = os.path.join(os.path.dirname(__file__), "../../../ios/HalkvaktApp/Sources/Fonts")

CROP_TOP = 150                      # statusraden + "◀ TestFlight" i råpixlar
SCREEN_W = 1120                     # skärmens bredd på duken — telefonen löper ut genom nederkanten
BAND = 60                           # skärmens egen färg ovanför appens rubrik (där statusraden satt)
RAM = 24                            # ramens tjocklek
R_SCREEN, R_RAM = 150, 174          # hörn
PHONE_TOP = 760

# (råfil, etikett, rubrik). Ordningen = butikens ordning.
BILDER = [
    ("99ea591b", "Varningskortet", "Gult i åtta sekunder.\nSedan tyst."),
    ("a479b0f3", "Vakten",         "Ett ord. En knapp.\nSedan kör du."),
    ("abf993ba", "Körläget",       "Tre kameror framför dig.\nRösten säger till."),
    ("9e0f4ba7", "Så fungerar det", "Rösten säger till\ninnan du är där."),
    ("918d06d0", "Inställningar",  "Fem källor. Slå av\ndet du inte vill höra."),
    ("55fd6ca3", "Integritet",     "Din position lämnar\ninte telefonen."),
    ("11b411bb", "Autostart",      "Vaknar själv när du kör.\nStoppar själv."),
    ("8dcd46d2", "Under körning",  "En kort banner över\nkartan. Inget att trycka."),
]

def sans(size, bold=True):
    f = ImageFont.truetype(os.path.join(FONTS, "InstrumentSans.ttf"), size)
    try: f.set_variation_by_name("Bold" if bold else "Regular")
    except Exception: pass
    return f

def mono(size):
    return ImageFont.truetype(os.path.join(FONTS, "IBMPlexMono-Medium.ttf"), size)

def centrerad(d, y, text, font, fill, sparr=0):
    w = sum(d.textlength(ch, font=font) + sparr for ch in text) - sparr
    x = (W - w) / 2
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill); x += d.textlength(ch, font=font) + sparr

def rama(ra, etikett, rubrik, ut):
    duk = Image.new("RGB", (W, H), PAPPER)
    d = ImageDraw.Draw(duk)
    centrerad(d, 230, etikett.upper(), mono(32), YELLOW_INK, sparr=7)
    f = sans(104); yy = 300
    for rad in rubrik.split("\n"):
        centrerad(d, yy, rad, f, BLACK, sparr=-2); yy += 112

    # Skärmen
    im = Image.open(ra).convert("RGB").crop((0, CROP_TOP, 1170, 2532))
    sh = round(im.height * SCREEN_W / im.width)
    im = im.resize((SCREEN_W, sh), Image.LANCZOS)
    band = Image.new("RGB", (SCREEN_W, sh + BAND), im.getpixel((8, 8))); band.paste(im, (0, BAND)); im = band
    sx = (W - SCREEN_W) // 2; sy = PHONE_TOP

    # Skugga under ramen, mjuk
    skugga = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(skugga).rounded_rectangle((sx - RAM, sy - RAM + 30, sx + SCREEN_W + RAM, sy + im.height + RAM + 30), radius=R_RAM, fill=(0, 0, 0, 70))
    skugga = skugga.filter(ImageFilter.GaussianBlur(40))
    duk = Image.alpha_composite(duk.convert("RGBA"), skugga)

    # Ramen: grafit med en ljusare kant (metall), sedan skärmen med rundade hörn, sedan Dynamic Island
    lager = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ld = ImageDraw.Draw(lager)
    ld.rounded_rectangle((sx - RAM, sy - RAM, sx + SCREEN_W + RAM, sy + im.height + RAM), radius=R_RAM, fill=GRAFIT, outline=GRAFIT_KANT, width=4)
    duk = Image.alpha_composite(duk, lager)
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius=R_SCREEN, fill=255)
    duk.paste(im, (sx, sy), mask)
    ImageDraw.Draw(duk).rounded_rectangle((W // 2 - 120, sy + 22, W // 2 + 120, sy + 92), radius=35, fill=SVART)
    duk.convert("RGB").save(ut, "PNG", optimize=True)
    print(os.path.basename(ut))

if __name__ == "__main__":
    src = sys.argv[1]
    out = os.path.dirname(os.path.abspath(__file__))
    for f in os.listdir(out):
        if f[:2].isdigit() and f.endswith(".png"): os.remove(os.path.join(out, f))
    for i, (ra, etikett, rubrik) in enumerate(BILDER, 1):
        namn = etikett.lower().replace(" ", "-").replace("å", "a").replace("ä", "a").replace("ö", "o")
        rama(os.path.join(src, f"{ra}-image.png"), etikett, rubrik, os.path.join(out, f"{i:02d}-{namn}.png"))
    # Översikten: alla i en rad, för att se serien som i butiken.
    bilder = [Image.open(os.path.join(out, f)) for f in sorted(os.listdir(out)) if f[:2].isdigit() and f.endswith(".png")]
    tw = 330; th = round(H * tw / W)
    rad = Image.new("RGB", (tw * len(bilder) + 20 * (len(bilder) + 1), th + 40), (225, 218, 205))
    for i, b in enumerate(bilder):
        rad.paste(b.resize((tw, th), Image.LANCZOS), (20 + i * (tw + 20), 20))
    rad.save(os.path.join(out, "oversikt.jpg"), "JPEG", quality=88); print("oversikt.jpg")
