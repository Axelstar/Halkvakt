"""Bildläsningsspåret (kort #246, DECISIONS #335/#339): kamerabilder → kontaktark → blind klassning → Axels ok → kamerafacit.

Fyra steg, ett kommando var:

  python scripts/kontaktark.py direkt --antal 20 --ut <mapp>
      Hämtar Trafikverkets DIREKTBILDER (publika, just nu — inte facit-hinken) från väglagskameror inom 2 km av
      skuggrutterna, jämnt spridda längs rutterna. Provet av spåret; hinken rörs inte (DECISIONS #248).
  python scripts/kontaktark.py mapp <hinkexport> --ut <mapp>
      Samma sak för Axels export av facit-hinken (filnamn KAMERA-TREHTIMMARSHINK.jpg). Används i mars.
  python scripts/kontaktark.py stickprov <mapp>/klassning.json
      Efter klassningen: markerar stickprovet (VARJE is/snö/slask plus minst 10 % av resten, deterministiskt valt) och
      skriver ok-sidan för Axel (ok.md).
  python scripts/kontaktark.py sql <mapp>/klassning.json
      Skriver en INSERT-rad per klassad bild — BARA om klassning.json bär Axels ok ("ok": {"av": ...}). Raderna körs via
      dbknapp. Utan ok: vägrar högljutt.

BLINDHETEN. Arket visar nummer, kameranamn och klockslag — aldrig vad skuggan sa, eftersom manifestet inte bär det. Den som
klassar ser alltså samma sak som en förare som tittade på kameran: vägbanan.

Klasserna är tabellens sex (sql/033): is · snö · slask · våt · bar · okänd. Säkerhet: hög · medel · låg. Nattbild och svartis:
svartis syns aldrig i bild (TROSKLAR-SKUGGAN §2), så "bar" på en natt under noll betyder "ingen synlig beläggning", inget mer.
"""
import argparse, datetime as dt, email.utils, hashlib, io, json, math, os, re, sys, urllib.request
from PIL import Image, ImageDraw, ImageFont

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CDN = "https://axelstar.github.io/halkvakt-karta/data/kameror-vaglag.geojson"
FACIT_KM = 2.0                  # TROSKLAR-SKUGGAN §2: facit inom 2 km av segmentlinjen — samma tal som engine/src/segment.ts
KLASSER = ("is", "snö", "slask", "våt", "bar", "okänd")
HALKA = ("is", "snö", "slask")  # de enda som räknas som händelse i grind S-B
KOL, RAD, BRED, HOJD, ETIKETT = 4, 5, 384, 216, 22


def rutter():
    kod = open(os.path.join(ROT, "supabase/functions/skuggmotor/main.ts"), encoding="utf-8").read()
    start = kod.index("const ROUTES: Record<string, [number, number][]> = {")
    slut = kod.index("\n};", start)
    kropp = kod[kod.index("{", start):slut + 2]
    kropp = re.sub(r"^\s*//.*$", "", kropp, flags=re.M)
    kropp = re.sub(r",(\s*})", r"\1", kropp)
    r = json.loads(kropp)
    if len(r) < 10: raise SystemExit(f"skuggmotorns rutter tolkades som {len(r)} — har formen ändrats?")
    return r


def narmast(p, linje):
    """Avstånd (km) från punkt till polylinje och läge längs den (km), lokal planprojektion per delsträcka."""
    bast, vid, kum = math.inf, 0.0, 0.0
    for (ax, ay), (bx, by) in zip(linje, linje[1:]):
        c = math.cos(math.radians((ay + by) / 2))
        B = ((bx - ax) * c * 111.32, (by - ay) * 110.57)
        P = ((p[0] - ax) * c * 111.32, (p[1] - ay) * 110.57)
        l2 = B[0] ** 2 + B[1] ** 2
        t = max(0.0, min(1.0, (P[0] * B[0] + P[1] * B[1]) / l2)) if l2 else 0.0
        d = math.hypot(P[0] - t * B[0], P[1] - t * B[1])
        seg = math.hypot(*B)
        if d < bast: bast, vid = d, kum + t * seg
        kum += seg
    return bast, vid


def hamta_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "halkvakt-kontaktark"}), timeout=30) as r:
        return json.loads(r.read())


def kameror():
    fs = hamta_json(CDN)["features"]
    return {f["properties"]["id"]: {"id": f["properties"]["id"], "namn": f["properties"].get("name") or f["properties"]["id"],
                                    "foto": f["properties"].get("photo"), "lon": f["geometry"]["coordinates"][0],
                                    "lat": f["geometry"]["coordinates"][1]} for f in fs}


def vid_rutterna(kam, rr):
    ut = []
    for k in kam.values():
        best = min(((narmast((k["lon"], k["lat"]), l), n) for n, l in rr.items()), key=lambda x: x[0][0])
        (d, km), namn = best
        if d <= FACIT_KM: ut.append({**k, "rutt": namn, "km": round(km, 1), "avstand_km": round(d, 2)})
    return sorted(ut, key=lambda x: (x["rutt"], x["km"]))


def jamnt(lista, n):
    if len(lista) <= n: return lista
    return [lista[round(i * (len(lista) - 1) / (n - 1))] for i in range(n)]


def ark(manifest, ut):
    try: font = ImageFont.truetype("arial.ttf", 15)
    except OSError: font = ImageFont.load_default()
    sidor = [manifest[i:i + KOL * RAD] for i in range(0, len(manifest), KOL * RAD)]
    filer = []
    for s, sida in enumerate(sidor, 1):
        bild = Image.new("RGB", (KOL * BRED, RAD * (HOJD + ETIKETT)), "white")
        rita = ImageDraw.Draw(bild)
        for i, m in enumerate(sida):
            x, y = (i % KOL) * BRED, (i // KOL) * (HOJD + ETIKETT)
            try:
                b = Image.open(os.path.join(ut, m["fil"])).convert("RGB")
                b.thumbnail((BRED, HOJD))
                bild.paste(b, (x + (BRED - b.width) // 2, y + ETIKETT))
            except Exception as e:
                rita.text((x + 8, y + ETIKETT + 90), f"kunde inte öppnas: {e}"[:48], fill="red", font=font)
            lokal = dt.datetime.fromisoformat(m["bild_tid"].replace("Z", "+00:00")).strftime("%H:%M")
            rita.rectangle((x, y, x + BRED - 1, y + ETIKETT - 1), fill=(30, 30, 30))
            rita.text((x + 6, y + 3), f"{m['nr']:>2} · {m['namn'][:26]} · {lokal}Z", fill="white", font=font)
        fil = f"ark-{s:02d}.jpg"
        bild.save(os.path.join(ut, fil), quality=88)
        filer.append(fil)
    return filer


def direkt(a):
    os.makedirs(os.path.join(a.ut, "bilder"), exist_ok=True)
    urval = jamnt(vid_rutterna(kameror(), rutter()), a.antal)
    manifest = []
    for nr, k in enumerate(urval, 1):
        if not k["foto"]: continue
        req = urllib.request.Request(k["foto"], headers={"User-Agent": "halkvakt-kontaktark"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
            lm = r.headers.get("Last-Modified")
        tid = email.utils.parsedate_to_datetime(lm).astimezone(dt.timezone.utc) if lm else dt.datetime.now(dt.timezone.utc)
        fil = f"bilder/{k['id']}-{tid.strftime('%Y%m%dT%H%MZ')}.jpg"
        open(os.path.join(a.ut, fil), "wb").write(data)
        manifest.append({"nr": nr, "kamera_id": k["id"], "namn": k["namn"], "lon": k["lon"], "lat": k["lat"],
                         "bild_tid": tid.strftime("%Y-%m-%dT%H:%M:%SZ"), "fil": fil, "rutt": k["rutt"], "km": k["km"],
                         "sha256": hashlib.sha256(data).hexdigest()[:16], "kalla": "Trafikverkets direktbild (inte facit-hinken)"})
    avsluta(a.ut, manifest)


def mapp(a):
    os.makedirs(a.ut, exist_ok=True)
    kam = kameror()
    manifest = []
    for nr, namn in enumerate(sorted(f for f in os.listdir(a.mapp) if f.endswith(".jpg")), 1):
        # Skuggmotorns bilder: <kamera>-<tretimmarsperiod>.jpg. Kamerafacit V2/V3 (DECISIONS #380): <kamera>-h<timme>.jpg.
        m = re.match(r"(.+)-(h?)(\d+)\.jpg$", namn)
        if not m or m.group(1) not in kam: print(f"hoppar över {namn}: okänd kamera eller form"); continue
        k = kam[m.group(1)]
        tid = dt.datetime.fromtimestamp(int(m.group(3)) * (3600 if m.group(2) else 10800), dt.timezone.utc)
        data = open(os.path.join(a.mapp, namn), "rb").read()
        manifest.append({"nr": nr, "kamera_id": k["id"], "namn": k["namn"], "lon": k["lon"], "lat": k["lat"],
                         "bild_tid": tid.strftime("%Y-%m-%dT%H:%M:%SZ"), "fil": os.path.join(a.mapp, namn),
                         "sha256": hashlib.sha256(data).hexdigest()[:16], "kalla": f"facit-hinken {namn} (treTimmarshinkens start)"})
    avsluta(a.ut, manifest)


def avsluta(ut, manifest):
    json.dump(manifest, open(os.path.join(ut, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    filer = ark(manifest, ut)
    mall = {"ark": filer, "klassad_av": None, "klassad": None, "ok": {"av": None, "nar": None, "avvikelser": []},
            "rader": [{**{k: m[k] for k in ("nr", "kamera_id", "namn", "lon", "lat", "bild_tid", "fil")},
                       "klass": None, "sakerhet": None, "anteckning": "", "stickprov": False} for m in manifest]}
    json.dump(mall, open(os.path.join(ut, "klassning.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(manifest)} bilder → {', '.join(filer)} · manifest.json · klassning.json (tom mall) i {ut}")


def stickprov(a):
    k = json.load(open(a.fil, encoding="utf-8"))
    rader = k["rader"]
    fel = [r["nr"] for r in rader if r["klass"] not in KLASSER or r["sakerhet"] not in ("hög", "medel", "låg")]
    if fel: raise SystemExit(f"ej klassade eller ogiltiga: {fel}")
    for r in rader: r["stickprov"] = r["klass"] in HALKA
    ovriga = sorted((r for r in rader if not r["stickprov"]), key=lambda r: hashlib.sha256(r["fil"].encode()).hexdigest())
    for r in ovriga[:max(1, math.ceil(len(rader) / 10))]: r["stickprov"] = True
    json.dump(k, open(a.fil, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    mapp_ = os.path.dirname(a.fil)
    s = [f"# Ok-sida för Axel — {', '.join(k['ark'])}\n",
         f"Klassad av {k['klassad_av']} {k['klassad']}, blint (arket visar nummer, kamera och klockslag — aldrig skuggans larm).",
         "Titta på de markerade bilderna och säg **ok**, eller rätta klassen på en rad. Varje is/snö/slask är med, plus minst 10 %",
         "av resten. När du sagt ok skriver Claude `\"ok\": {\"av\": \"Axel\", ...}` i klassning.json och kör in raderna.\n",
         "| Nr | Kamera | Tid (UTC) | Klass | Säkerhet | Anteckning | Stickprov |", "| --: | :-- | :-- | :-- | :-- | :-- | :-- |"]
    for r in rader:
        s.append(f"| {r['nr']} | {r['namn']} | {r['bild_tid'][11:16]} | **{r['klass']}** | {r['sakerhet']} | {r['anteckning']} | "
                 f"{'👁️ [bild](' + r['fil'] + ')' if r['stickprov'] else ''} |")
    n = sum(r["stickprov"] for r in rader)
    per = {c: sum(r["klass"] == c for r in rader) for c in KLASSER}
    s.append(f"\n{len(rader)} bilder: " + " · ".join(f"{c} {v}" for c, v in per.items()) + f". Stickprov: {n}.")
    open(os.path.join(mapp_, "ok.md"), "w", encoding="utf-8").write("\n".join(s) + "\n")
    print(f"stickprov {n} av {len(rader)} · ok.md skriven")


def sql(a):
    k = json.load(open(a.fil, encoding="utf-8"))
    if not (k.get("ok") or {}).get("av"): raise SystemExit("VÄGRAR: klassning.json bär inget ok. Axels ok först (DECISIONS #335).")
    rattat = {int(x["nr"]): x["klass"] for x in k["ok"].get("avvikelser", [])}
    av = f"{k['klassad_av']} (ok: {k['ok']['av']} {k['ok']['nar']})".replace("'", "''")
    for r in k["rader"]:
        klass = rattat.get(r["nr"], r["klass"])
        bild = r["fil"].replace("\\", "/")
        if not bild.startswith("docs/"): bild = os.path.relpath(os.path.join(os.path.dirname(a.fil), r["fil"]), ROT).replace("\\", "/")
        print(f"INSERT INTO kamerafacit (bild, kamera_id, lon, lat, bild_tid, klass, av) VALUES ('{bild}', '{r['kamera_id']}', "
              f"{r['lon']}, {r['lat']}, '{r['bild_tid']}', '{klass}', '{av}') ON CONFLICT (bild) DO UPDATE SET klass = EXCLUDED.klass, "
              f"av = EXCLUDED.av, klassad = now()")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    u = p.add_subparsers(dest="steg", required=True)
    d = u.add_parser("direkt"); d.add_argument("--antal", type=int, default=20); d.add_argument("--ut", required=True)
    m = u.add_parser("mapp"); m.add_argument("mapp"); m.add_argument("--ut", required=True)
    s = u.add_parser("stickprov"); s.add_argument("fil")
    q = u.add_parser("sql"); q.add_argument("fil")
    a = p.parse_args()
    {"direkt": direkt, "mapp": mapp, "stickprov": stickprov, "sql": sql}[a.steg](a)
