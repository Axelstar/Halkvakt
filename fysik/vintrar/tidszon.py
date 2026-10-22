"""Tidszonsprovet mot SMHI för en vinter (förregistreringen §3 b): scripts/matningar/kuvos-tidszon-2026-10-02.py med vintern som
parameter. Kedjan antar att stämplarna är svensk lokaltid (fysik/prep.py:11); provet ska visa det för varje vinter innan den läses.

Samma prov som 2/10 (KUVOS-LEVERANSEN §3), bestämt innan något tal är läst:
  - urvalet: för varje breddgradsband 55–57,5–60–62,5–65–69 °N VViS-stationer med närmaste SMHI-station inom 8 km som har
    corrected-archive över hela perioden (1/11–1/4 UTC), sorterade på avståndet, en SMHI-station en gång per band; lägena ur
    indatans stations.csv, och bara stationer som finns i vinterns filer;
  - VViS-luften vid hel timme (minut 00), stämpeln läst som Europe/Stockholm och gjord om till UTC; −99,9 är saknad;
  - timförändringen T(h) − T(h−1) mot SMHI:s, förskjutningen −3 … +3 h, korrelationen över minst 101 timpar; de två första paren
    per band som har ett värde räknas.
Provet är klarat när varje räknat par har sin topp vid 0 h och minst fem par räknats (2/10: tio av tio vid 0 h). Annat läses inte
den vintern, och frågan går till Bengt (§3).
Källa: SMHI:s öppna data (metobs, parameter 1, CC BY 4.0).
"""
import collections, datetime as dt, io, json, math, os, urllib.request
import pandas as pd

BAND = [(55, 57.5), (57.5, 60), (60, 62.5), (62.5, 65), (65, 69)]
MAX_KM, PER_BAND, MIN_PAR = 8, 2, 5
LISTA = "https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/1.json"
SERIE = "https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/1/station/{}/period/corrected-archive/data.csv"


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def kor(a, b):
    n = len(a); ma, mb = sum(a) / n, sum(b) / n
    sa = math.sqrt(sum((x - ma) ** 2 for x in a)); sb = math.sqrt(sum((y - mb) ** 2 for y in b))
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb) if sa and sb else float("nan")


def hamta_fil(url, fil):
    if not os.path.exists(fil):
        data = urllib.request.urlopen(url, timeout=120).read()
        with open(fil, "wb") as fh: fh.write(data)
    return fil


def smhi_serie(fil):
    """corrected-archive som kuvos-tidszon läser den: Datum;Tid (UTC);Lufttemperatur;… → {UTC-timme: °C}."""
    ut = {}
    for rad in io.open(fil, encoding="utf-8"):
        f = rad.strip().split(";")
        if len(f) >= 3 and len(f[0]) == 10 and f[0][4] == "-":
            try: t = dt.datetime.strptime(f[0] + " " + f[1][:2], "%Y-%m-%d %H"); ut[t] = float(f[2])
            except ValueError: pass
    return ut


def provet(luft, stationer, start, slut, cache, lista=None, serie=None):
    """luft: sid, lokal (hel lokal timme), luft (°C, NaN saknad) ur lasare.rader. stationer: indatans stations.csv (sid, lon, lat).
    start/slut: perioden i UTC (naiva). lista/serie: SMHI:s stationslista (dict) och en funktion nyckel → fil (byts i självtestet)."""
    os.makedirs(cache, exist_ok=True)
    if lista is None:
        lista = json.load(open(hamta_fil(LISTA, os.path.join(cache, "smhi_p1.json")), encoding="utf-8"))
    if serie is None:
        serie = lambda k: hamta_fil(SERIE.format(k), os.path.join(cache, f"smhi_{k}.csv"))
    s0 = start.replace(tzinfo=dt.timezone.utc).timestamp(); s1 = slut.replace(tzinfo=dt.timezone.utc).timestamp()
    smhi = [(s["key"], s.get("name", s.get("title", "")), (s["latitude"], s["longitude"])) for s in lista["station"]
            if s.get("from", 0) / 1000 < s0 and s.get("to", 0) / 1000 > s1]
    pos = {r.sid: (r.lat, r.lon) for r in stationer.itertuples()}
    i_lev = set(luft.sid)
    kandidater = collections.defaultdict(list)
    for sid, p in pos.items():
        if sid not in i_lev or not smhi: continue
        d, best = min((km(p, s[2]), s) for s in smhi)
        if d <= MAX_KM:
            for i, (lo, hi) in enumerate(BAND):
                if lo <= p[0] < hi: kandidater[i].append((d, sid, best))
    urval = []
    for i in range(len(BAND)):
        sett = set()
        for d, sid, s in sorted(kandidater[i]):
            if s[0] in sett: continue
            sett.add(s[0]); urval.append((i, sid, s, d))
    # VViS: luften per hel timme, lokaltid → UTC (en obefintlig timme faller bort; sommartidsprovet visar att den saknas)
    l = luft[luft.sid.isin({u[1] for u in urval}) & luft.luft.notna()].copy()
    l["utc"] = l.lokal.dt.tz_localize("Europe/Stockholm", ambiguous=True, nonexistent="NaT").dt.tz_convert("UTC").dt.tz_localize(None)
    l = l.dropna(subset=["utc"]).drop_duplicates(["sid", "utc"], keep="last")
    vt = {sid: dict(zip(g.utc.dt.to_pydatetime(), g.luft)) for sid, g in l.groupby("sid")}
    par, per_band = [], collections.Counter()
    for i, sid, s, d in urval:
        if per_band[i] == PER_BAND: continue
        sm = smhi_serie(serie(s[0])); v = vt.get(sid, {})
        rad = []
        for k in range(-3, 4):
            a, b = [], []
            for t, x in v.items():
                t1 = t - dt.timedelta(hours=1)
                u, u1 = t + dt.timedelta(hours=k), t1 + dt.timedelta(hours=k)
                if t1 in v and u in sm and u1 in sm and start <= t < slut:
                    a.append(x - v[t1]); b.append(sm[u] - sm[u1])
            rad.append((k, kor(a, b) if len(a) > 100 else float("nan"), len(a)))
        giltiga = [r for r in rad if not math.isnan(r[1])]
        if not giltiga:
            continue
        bast = max(giltiga, key=lambda r: r[1])
        per_band[i] += 1
        par.append(dict(vvis=sid, smhi=s[0], namn=s[1], km=round(d, 1), timpar=rad[3][2],
                        korrelation={f"{r[0]:+d}": (round(r[1], 3) if not math.isnan(r[1]) else None) for r in rad}, bast=bast[0]))
    klarat = len(par) >= MIN_PAR and all(p["bast"] == 0 for p in par)
    return dict(par=par, smhi_stationer=len(smhi), kandidatpar=len(urval), klarat=bool(klarat),
                regel=f"varje räknat par har toppen vid 0 h och minst {MIN_PAR} par")
