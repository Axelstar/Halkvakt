# Kuvösens tidszon mätt, inte antagen (PLAN-KUVOSEN steg 3; förregistrerat i DECISIONS #424: "Tidszonen avgörs med mätning mot
# SMHI:s öppna serier före första körningen"). LÄS-ONLY. Trafikverkets stämplar saknar zon. Planens prov: lufttemperaturen vid tio
# stationer mot SMHI:s timserier (UTC) vid närmaste SMHI-station; förskjutningen med bäst samstämmighet ska vara noll timmar i UTC.
#
# Gjort så här, bestämt innan något tal är läst:
#   - Tio VViS-stationer: för varje breddgradsband 55–57,5–60–62,5–65–69 °N de två med närmast SMHI-station inom 8 km som har
#     corrected-archive över hela perioden. Koordinaterna ur dagens static.json; stationer som saknas där används inte.
#   - VViS-stämpeln tolkas som SVENSK LOKALTID (Europe/Stockholm) och görs om till UTC. Den hela timmen används (minut 00).
#   - Jämförelsen görs på timförändringen (T(h) − T(h−1)), inte på nivån: nivån är så autokorrelerad att toppen blir bred.
#   - Förskjutningar −3 … +3 h. Svar per station: den förskjutning som ger högst korrelation. Förväntat: 0 h på alla tio.
# Kör: python scripts/matningar/kuvos-tidszon-2026-10-02.py <mapp med Halkvakt_YYMM.csv> <static.json> <smhi_p1.json> <cachemapp>
import collections, datetime as dt, io, json, math, os, sys, urllib.request
from zoneinfo import ZoneInfo

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
MAPP, STATIC, SMHI_LISTA, CACHE = sys.argv[1:5]
os.makedirs(CACHE, exist_ok=True)
MANADER = ["2411", "2412", "2501", "2502", "2503"]
START, SLUT = dt.datetime(2024, 11, 1, tzinfo=dt.timezone.utc), dt.datetime(2025, 4, 1, tzinfo=dt.timezone.utc)
SE = ZoneInfo("Europe/Stockholm")
BAND = [(55, 57.5), (57.5, 60), (60, 62.5), (62.5, 65), (65, 69)]

def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))

vvis = {s["id"]: (s["lat"], s["lon"]) for s in json.load(io.open(STATIC, encoding="utf-8"))["stations"]}
smhi = []
for s in json.load(io.open(SMHI_LISTA, encoding="utf-8"))["station"]:
    if s.get("from", 0) / 1000 < START.timestamp() and s.get("to", 0) / 1000 > SLUT.timestamp():
        smhi.append((s["key"], s["name"] if "name" in s else s["title"], (s["latitude"], s["longitude"])))

# Vilka VViS-stationer finns i leveransen? (första filen räcker för urvalet)
i_lev = set()
with io.open(os.path.join(MAPP, "Halkvakt_2411.csv"), encoding="utf-8") as fh:
    fh.readline()
    for rad in fh:
        f = rad.split(";", 1)
        if f[0].isdigit(): i_lev.add(f[0])

kandidater = collections.defaultdict(list)
for sid, pos in vvis.items():
    if sid not in i_lev: continue
    d, best = min((km(pos, s[2]), s) for s in smhi)
    if d <= 8:
        for i, (lo, hi) in enumerate(BAND):
            if lo <= pos[0] < hi: kandidater[i].append((d, sid, best))
urval = []
for i in range(len(BAND)):
    sett = set()
    for d, sid, s in sorted(kandidater[i]):
        if s[0] in sett: continue
        sett.add(s[0]); urval.append((i, sid, s, d))
print(f"Kandidater: {len(urval)} par inom 8 km, SMHI-stationer med arkiv över perioden: {len(smhi)}")

# VViS: lufttemperatur per hel timme, lokaltid → UTC
behov = {u[1] for u in urval}
vt = {sid: {} for sid in behov}
for m in MANADER:
    with io.open(os.path.join(MAPP, f"Halkvakt_{m}.csv"), encoding="utf-8") as fh:
        fh.readline()
        for rad in fh:
            f = rad.rstrip("\r\n").split(";")
            if len(f) != 13 or f[0] not in behov or f[1][14:16] != "00": continue
            x = float(f[3].replace(",", "."))
            if x == -99.9: continue
            lokal = dt.datetime.strptime(f[1][:13], "%Y-%m-%d %H").replace(tzinfo=SE)
            vt[f[0]][lokal.astimezone(dt.timezone.utc).replace(tzinfo=None)] = x

def smhi_serie(nyckel):
    fil = os.path.join(CACHE, f"smhi_{nyckel}.csv")
    if not os.path.exists(fil):
        url = f"https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/1/station/{nyckel}/period/corrected-archive/data.csv"
        io.open(fil, "wb").write(urllib.request.urlopen(url, timeout=120).read())
    ut = {}
    for rad in io.open(fil, encoding="utf-8"):
        f = rad.strip().split(";")
        if len(f) >= 3 and len(f[0]) == 10 and f[0][4] == "-":
            try: t = dt.datetime.strptime(f[0] + " " + f[1][:2], "%Y-%m-%d %H"); ut[t] = float(f[2])
            except ValueError: pass
    return ut

def kor(a, b):
    n = len(a); ma, mb = sum(a) / n, sum(b) / n
    sa = math.sqrt(sum((x - ma) ** 2 for x in a)); sb = math.sqrt(sum((y - mb) ** 2 for y in b))
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb) if sa and sb else float("nan")

print("\nVViS · SMHI (avstånd) · timpar · korrelation per förskjutning −3…+3 h · bäst")
svar = collections.Counter(); per_band = collections.Counter()
for i, sid, s, d in urval:
    if per_band[i] == 2: continue
    sm = smhi_serie(s[0]); v = vt[sid]
    rad = []
    for k in range(-3, 4):
        a, b = [], []
        for t, x in v.items():
            t1 = t - dt.timedelta(hours=1)
            u, u1 = t + dt.timedelta(hours=k), t1 + dt.timedelta(hours=k)
            if t1 in v and u in sm and u1 in sm and START.replace(tzinfo=None) <= t < SLUT.replace(tzinfo=None):
                a.append(x - v[t1]); b.append(sm[u] - sm[u1])
        rad.append((k, kor(a, b) if len(a) > 100 else float("nan"), len(a)))
    giltiga = [r for r in rad if not math.isnan(r[1])]
    if not giltiga:
        print(f"  {sid:>5} · {s[1][:22]:22} ({d:.1f} km) · hoppas över: inga gemensamma timmar (VViS {len(v)}, SMHI i perioden "
              f"{sum(1 for t in sm if START.replace(tzinfo=None) <= t < SLUT.replace(tzinfo=None))})"); continue
    bast = max(giltiga, key=lambda r: r[1])
    svar[bast[0]] += 1; per_band[i] += 1
    print(f"  {sid:>5} · {s[1][:22]:22} ({d:.1f} km) · {rad[3][2]:>5} · " + " ".join(f"{r[1]:+.2f}" for r in rad) + f" · {bast[0]:+d} h")
print(f"\nBästa förskjutning, antal stationer: {dict(sorted(svar.items()))}  (0 h = stämpeln är svensk lokaltid)")
