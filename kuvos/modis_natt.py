"""KALLKARTAN UR SATELLITEN (kort #296 steg 3, DECISIONS #470). MODIS natt-LST (MOD11A1 Terra, MYD11A1 Aqua, version 061,
1 km) över Sverige, tre vintrar oktober–april, till en karta över var marken blir kallare än sin omgivning en klar natt.

Receptet (fast i DECISIONS #470 innan något körs):
  1. Bara pixlar med QC_Night bit 0–1 = 00 (LST framställd, god kvalitet) — i praktiken klar himmel.
  2. Per natt och satellit läggs de fyra rutorna (h18/h19 × v02/v03) ihop till en mosaik 2400 × 2400.
  3. Lokal avvikelse = pixelns LST minus medlet av giltiga pixlar i en ruta 51 × 51 (±25 km) runt den. Kräver minst 200 giltiga
     grannar; annars ingen avvikelse den natten. Det tar bort nattens väder och lämnar platsens egenhet.
  4. Kartan = medel och spridning av avvikelsen per pixel över alla klara nätter, och antalet nätter.
Ingen station och ingen vägdata läses — kartan byggs helt utan facit. Utfilerna: kallkartan som npz (summor och antal per pixel)
och en rad per station i static.json med pixelns medelavvikelse.

Hämtning: CMR (publik) listar granulerna; LP DAAC lämnar ut dem med nyckeln i EARTHDATA_TOKEN (en GitHub-hemlighet, aldrig i
koden). Filerna läses och kastas — bara summorna sparas.

Kör:       EARTHDATA_TOKEN=... python3 kuvos/modis_natt.py <static.json> <utmapp> [parallellt=6]
Självtest: python3 kuvos/modis_natt.py --sjalvtest
Källa: NASA LP DAAC, MOD11A1/MYD11A1 v061 (fria att använda, källan anges).
"""
import concurrent.futures as cf, csv, json, math, os, sys, tempfile, threading, time
import numpy as np
from scipy.ndimage import uniform_filter

R = 6371007.181                  # MODIS sinusoidala sfär (m)
T = 1111950.5197665              # en rutas sida (m)
N = 1200                         # pixlar per rutas sida (1 km)
RUTOR = [(18, 2), (19, 2), (18, 3), (19, 3)]   # Sverige (CMR 6/10: just dessa fyra för Sveriges ruta)
FONSTER = 51                     # 51 px ≈ ±25 km
MIN_GRANNAR = 200
VINTRAR = [("2022-10-01", "2023-04-30"), ("2023-10-01", "2024-04-30"), ("2024-10-01", "2025-04-30")]
PRODUKTER = ["MOD11A1", "MYD11A1"]
CMR = "https://cmr.earthdata.nasa.gov/search/granules.json"
UA = "Halkvakt-kuvosen/0.1 (+https://github.com/Axelstar/Halkvakt)"


def pixel(lat, lon):
    """Lat/lon → (h, v, rad, kolumn) i MODIS sinusoidala rutnät."""
    x = R * math.radians(lon) * math.cos(math.radians(lat))
    y = R * math.radians(lat)
    h = math.floor((x + 18 * T) / T)
    v = math.floor((9 * T - y) / T)
    kol = math.floor(((x + 18 * T) - h * T) / (T / N))
    rad = math.floor(((9 * T - y) - v * T) / (T / N))
    return h, v, rad, kol


def mosaikplats(h, v, rad, kol):
    """Plats i mosaiken 2400 × 2400, eller None utanför de fyra rutorna."""
    if (h, v) not in RUTOR:
        return None
    return (v - 2) * N + rad, (h - 18) * N + kol


def bra_kvalitet(qc):
    """QC_Night bit 0–1 = 00: LST framställd, god kvalitet."""
    return (qc & 0b11) == 0


def avvikelse(lst, giltig):
    """Pixelns LST minus medlet av giltiga pixlar i fönstret; NaN där fönstret har för få giltiga pixlar eller pixeln är ogiltig."""
    g = giltig.astype(np.float64)
    v = np.where(giltig, lst, 0.0)
    antal = uniform_filter(g, FONSTER, mode="constant") * FONSTER * FONSTER
    summa = uniform_filter(v, FONSTER, mode="constant") * FONSTER * FONSTER
    with np.errstate(invalid="ignore", divide="ignore"):
        medel = summa / antal
    ut = lst - medel
    ut[~giltig | (antal < MIN_GRANNAR - 0.5)] = np.nan
    return ut


def las_hdf(fil):
    """MOD11A1/MYD11A1 → (LST i K som float, QC) för natten."""
    from pyhdf.SD import SD, SDC
    sd = SD(fil, SDC.READ)
    lst = sd.select("LST_Night_1km").get().astype(np.float64)
    qc = sd.select("QC_Night").get().astype(np.uint8)
    sd.end()
    lst[lst == 0] = np.nan                     # fyllnadsvärde 0
    return lst * 0.02, qc                      # skalfaktor 0,02 K


def granuler(produkt, fran, till):
    """CMR → {(datum, h, v): url} för Sveriges fyra rutor. Publikt, ingen nyckel."""
    import requests
    ut, sida = {}, 1
    while True:
        r = requests.get(CMR, params={"short_name": produkt, "version": "061", "temporal": f"{fran}T00:00:00Z,{till}T23:59:59Z",
                                      "bounding_box": "10.5,55.0,24.5,69.5", "page_size": 2000, "page_num": sida},
                         headers={"User-Agent": UA}, timeout=120)
        r.raise_for_status()
        poster = r.json()["feed"]["entry"]
        for e in poster:
            gid = e["producer_granule_id"]                       # MOD11A1.A2025015.h18v02.061.2025016180305
            d, hv = gid.split(".")[1][1:], gid.split(".")[2]
            h, v = int(hv[1:3]), int(hv[4:6])
            url = next((l["href"] for l in e["links"] if l["href"].endswith(".hdf") and l["href"].startswith("https://")), None)
            if (h, v) in RUTOR and url:
                ut[(d, h, v)] = url
        if len(poster) < 2000:
            return ut
        sida += 1


def hamta(session, url, mapp):
    for forsok in range(6):
        try:
            r = session.get(url, timeout=300, allow_redirects=True)
            if r.status_code in (401, 403):
                raise SystemExit(f"LP DAAC svarade {r.status_code}: nyckeln (EARTHDATA_TOKEN) godtas inte — {r.text[:200]}")
            r.raise_for_status()
            fd, fil = tempfile.mkstemp(suffix=".hdf", dir=mapp)
            with os.fdopen(fd, "wb") as f:
                f.write(r.content)
            return fil
        except SystemExit:
            raise
        except Exception as e:
            if forsok == 5:
                raise RuntimeError(f"{url}: {e}")
            time.sleep(5 * (forsok + 1))


def main(static_json, mapp, parallellt=6):
    import requests
    nyckel = os.environ.get("EARTHDATA_TOKEN", "").strip()
    if not nyckel:
        raise SystemExit("EARTHDATA_TOKEN saknas")
    os.makedirs(mapp, exist_ok=True)
    tmp = tempfile.mkdtemp(dir=mapp)
    summa = np.zeros((2 * N, 2 * N)); summa2 = np.zeros((2 * N, 2 * N)); antal = np.zeros((2 * N, 2 * N), np.int32)
    las = threading.Lock()
    lokal = threading.local()

    def session():
        if not hasattr(lokal, "s"):
            lokal.s = requests.Session()
            lokal.s.headers.update({"Authorization": f"Bearer {nyckel}", "User-Agent": UA})
        return lokal.s

    natter = tomma = 0
    for produkt in PRODUKTER:
        for fran, till in VINTRAR:
            g = granuler(produkt, fran, till)
            datum = sorted({d for d, _, _ in g})
            print(f"{produkt} {fran}–{till}: {len(g)} granuler, {len(datum)} dygn", flush=True)

            def en_natt(d):
                mos = np.full((2 * N, 2 * N), np.nan); ok = np.zeros((2 * N, 2 * N), bool)
                for h, v in RUTOR:
                    url = g.get((d, h, v))
                    if not url:
                        continue
                    fil = hamta(session(), url, tmp)
                    try:
                        lst, qc = las_hdf(fil)
                    finally:
                        os.remove(fil)
                    y0, x0 = (v - 2) * N, (h - 18) * N
                    mos[y0:y0 + N, x0:x0 + N] = lst
                    ok[y0:y0 + N, x0:x0 + N] = bra_kvalitet(qc) & np.isfinite(lst)
                return avvikelse(np.nan_to_num(mos), ok)

            with cf.ThreadPoolExecutor(parallellt) as ex:
                for i, a in enumerate(ex.map(en_natt, datum)):
                    m = np.isfinite(a)
                    with las:
                        summa[m] += a[m]; summa2[m] += a[m] ** 2; antal[m] += 1
                    natter += 1
                    if not m.any():
                        tomma += 1
                    if (i + 1) % 30 == 0:
                        print(f"  {produkt} {datum[i]}: {i + 1}/{len(datum)} nätter", flush=True)
    os.rmdir(tmp)
    np.savez_compressed(os.path.join(mapp, "kallkartan_modis.npz"), summa=summa.astype(np.float32), summa2=summa2.astype(np.float32),
                        antal=antal, rutor=np.array(RUTOR), fonster=FONSTER, min_grannar=MIN_GRANNAR)
    stationer = json.load(open(static_json))["stations"]
    with open(os.path.join(mapp, "kallkartan_stationer.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["station_id", "lat", "lon", "h", "v", "rad", "kol", "natter", "medelavvikelse_k", "spridning_k"])
        for s in stationer:
            h, v, rad, kol = pixel(s["lat"], s["lon"])
            p = mosaikplats(h, v, rad, kol)
            if p is None:
                w.writerow([s["id"], s["lat"], s["lon"], h, v, rad, kol, 0, "", ""]); continue
            n = int(antal[p]); mu = summa[p] / n if n else float("nan")
            sd = math.sqrt(max(summa2[p] / n - mu * mu, 0)) if n else float("nan")
            w.writerow([s["id"], s["lat"], s["lon"], h, v, rad, kol, n, "" if not n else f"{mu:.3f}", "" if not n else f"{sd:.3f}"])
    tackta = int((antal > 0).sum())
    print(f"klart: {natter} nätter (varav {tomma} utan en enda klar pixel), {tackta} pixlar med minst en natt, "
          f"median {int(np.median(antal[antal > 0])) if tackta else 0} nätter per pixel", flush=True)


def sjalvtest():
    # Rutnätet: (0, 0) är rutan h18v09:s hörn; Malmö i v03, Kiruna i v02, båda i h18.
    assert pixel(0.0, 0.0) == (18, 9, 0, 0), pixel(0.0, 0.0)
    assert pixel(55.6, 13.0)[:2] == (18, 3) and pixel(67.85, 20.2)[:2] == (18, 2)
    assert mosaikplats(18, 2, 0, 0) == (0, 0) and mosaikplats(19, 3, 5, 7) == (1205, 1207) and mosaikplats(17, 2, 0, 0) is None
    # Kvaliteten: bara 00 i bit 0–1 godtas, de högre bitarna spelar ingen roll.
    assert list(bra_kvalitet(np.array([0, 1, 2, 3, 0b01000000, 0b01000001], np.uint8))) == [True, False, False, False, True, False]
    # Avvikelsen: ett jämnt fält 260 K med en kall punkt (−3 K) — punkten ska få ≈ −3, omgivningen ≈ 0, och vädret (+10 K på
    # hela fältet en annan natt) ska inte synas alls.
    f = np.full((200, 200), 260.0); f[100, 100] = 257.0; g = np.ones_like(f, bool)
    a = avvikelse(f, g)
    assert abs(a[100, 100] + 3) < 0.01 and abs(a[100, 130]) < 1e-9, (a[100, 100], a[100, 130])
    assert np.allclose(avvikelse(f + 10, g)[90:110, 90:110], a[90:110, 90:110], equal_nan=True)
    # För få grannar (moln överallt utom en fläck) ⇒ ingen avvikelse.
    g2 = np.zeros_like(g); g2[100:110, 100:110] = True
    assert np.isnan(avvikelse(f, g2)).all()
    # HDF-läsningen: en påhittad fil med fyllnadsvärde och skalfaktor.
    from pyhdf.SD import SD, SDC
    d = tempfile.mkdtemp(); fil = os.path.join(d, "t.hdf")
    sd = SD(fil, SDC.WRITE | SDC.CREATE)
    x = sd.create("LST_Night_1km", SDC.UINT16, (2, 2)); x[:] = np.array([[0, 13000], [13500, 14000]], np.uint16); x.endaccess()
    q = sd.create("QC_Night", SDC.UINT8, (2, 2)); q[:] = np.array([[2, 0], [1, 0]], np.uint8); q.endaccess(); sd.end()
    lst, qc = las_hdf(fil)
    assert np.isnan(lst[0, 0]) and abs(lst[0, 1] - 260.0) < 1e-9 and list(bra_kvalitet(qc).ravel()) == [False, True, False, True]
    print("självtest: rutnätet, mosaiken, kvaliteten, avvikelsen och HDF-läsningen — alla rätt")


if __name__ == "__main__":
    if sys.argv[1:2] == ["--sjalvtest"]:
        sjalvtest()
    elif len(sys.argv) >= 3:
        main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 6)
    else:
        raise SystemExit(__doc__)
