"""Väderkällan, nivå 1b (kort #318, DECISIONS #505): hämtar ECMWF IFS ur Open-Meteos arkiv (CC BY 4.0, Open-Meteo.com / ECMWF)
timvis 31/10 2024 – 31/3 2025 för ALLA stationer i metnordic_stationer.csv (release kuvos-metnordic-2024-25, 854 punkter), i
stationens egen punkt — samma anrop som nivå 1 (vaderkallan-hamta-ecmwf-2026-10-09.py, models=ecmwf_ifs), men bara fälten nivå 1b
läser: luft och fukt (daggpunkten räknas ur dem, som för MET Nordic). En station per anrop, fyra åt gången, under Open-Meteos
gratisgräns (600 per minut, 10 000 per dygn). Kan avbrytas och startas om: färdiga stationer hoppas över.

Kör:   python -I vaderkallan-1b-hamta-ecmwf-2026-10-09.py <mapp>            → <mapp>/ec1b/<station>.json
Packa: python -I vaderkallan-1b-hamta-ecmwf-2026-10-09.py <mapp> --packa    → <mapp>/ecmwf_1b_2024-25.csv.gz (+ sha256, rader)"""
import csv, gzip, hashlib, json, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

d = sys.argv[1]
os.makedirs(d + "/ec1b", exist_ok=True)
stationer = list(csv.DictReader(open(d + "/metnordic_stationer.csv", encoding="utf-8")))
V = "temperature_2m,relative_humidity_2m"

def hamta(s):
    f = f"{d}/ec1b/{s['station_id']}.json"
    if os.path.exists(f):
        return "fanns"
    u = (f"https://archive-api.open-meteo.com/v1/archive?latitude={s['lat']}&longitude={s['lon']}&start_date=2024-10-31"
         f"&end_date=2025-03-31&hourly={V}&models=ecmwf_ifs&timezone=GMT")
    for forsok in range(8):
        try:
            with urllib.request.urlopen(u, timeout=120) as r:
                j = json.loads(r.read().decode("utf-8"))
            if len(j["hourly"]["time"]) != 3648:
                raise ValueError(f"{len(j['hourly']['time'])} timmar")
            tmp = f + ".tmp"
            open(tmp, "w", encoding="utf-8").write(json.dumps(j["hourly"]))
            os.replace(tmp, f)
            return "hämtad"
        except Exception as e:
            time.sleep(10 * (forsok + 1))
            sista = str(e)[:120]
    return "FEL " + sista

if "--packa" not in sys.argv:
    with ThreadPoolExecutor(4) as ex:
        for i, (s, ut) in enumerate(zip(stationer, ex.map(hamta, stationer)), 1):
            if i % 50 == 0 or ut.startswith("FEL"):
                print(i, "av", len(stationer), s["station_id"], ut, flush=True)
    print("KLART", sum(os.path.exists(f"{d}/ec1b/{s['station_id']}.json") for s in stationer), "av", len(stationer), flush=True)
else:
    ut = d + "/ecmwf_1b_2024-25.csv.gz"
    rader = 0
    with gzip.open(ut, "wt", encoding="utf-8", newline="") as g:
        w = csv.writer(g, lineterminator="\n")
        w.writerow(["station_id", "tid_utc", "t2m_c", "rh_pct"])
        for s in stationer:
            h = json.load(open(f"{d}/ec1b/{s['station_id']}.json", encoding="utf-8"))
            for t, a, b in zip(h["time"], h["temperature_2m"], h["relative_humidity_2m"]):
                w.writerow([s["station_id"], t + ":00Z", "" if a is None else a, "" if b is None else b]); rader += 1
    print(ut, rader, "rader", len(stationer), "stationer, sha256", hashlib.sha256(open(ut, "rb").read()).hexdigest())
