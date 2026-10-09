"""Väderkällan för fysikspåret, nivå 1 (DECISIONS #504): ECMWF IFS (Open-Meteos arkiv) mot MET Nordic Analysis, båda mot SMHI:s
mätstationer, vintern 2024/25 (31/10 2024 – 31/3 2025, UTC).

Punkterna: de 70 VViS-stationer som har en SMHI-station inom 5 km (vaderkallan-par-2026-10-09.py). Båda källorna tas i VViS-punkten
(MET Nordic i rutan närmast, ECMWF i Open-Meteos punkt) och jämförs med SMHI-stationens mätning samma timme. Bara timmar där alla tre
finns räknas, så källorna jämförs på exakt samma underlag. Facit: SMHI p1 lufttemperatur, p16 total molnmängd (113 = skymd, utesluten),
p7 nederbörd 1 h; kvalitet G och Y.

Kör: lägg data/vaderkallan/ecmwf_2024-25.csv.gz och stationspar_vviss_smhi.csv (i repot) och releaserna kuvos-metnordic-2024-25
och kuvos-smhi-2024-25 i en mapp och peka hit:
  python3 -I scripts/matningar/vaderkallan-jamforelse-2026-10-09.py <mapp>
Filer som läses: ecmwf_2024-25.csv.gz, stationspar_vviss_smhi.csv, metnordic_2024-25.csv.gz, smhi_p1_2024-25.csv.gz,
smhi_p16_2024-25.csv.gz, smhi_p7_2024-25.csv.gz.
"""
import csv, gzip, sys
from collections import defaultdict

d = sys.argv[1].rstrip('/')
par = {r['vviss']: r for r in csv.DictReader(open(d + '/stationspar_vviss_smhi.csv'))}
norr = {v: float(r['lat']) >= 62 for v, r in par.items()}

def tal(x):
    return float(x) if x not in ('', 'None') else None

ec = {}
for r in csv.DictReader(gzip.open(d + '/ecmwf_2024-25.csv.gz', 'rt')):
    ec[(r['station_id'], r['tid_utc'])] = (tal(r['t2m_c']), tal(r['moln_pct']), tal(r['nederbord_mm']))

mn = {}
for r in csv.DictReader(gzip.open(d + '/metnordic_2024-25.csv.gz', 'rt')):
    if r['station_id'] not in par:
        continue
    m = tal(r['moln'])
    mn[(r['station_id'], r['tid_utc'].replace('.000Z', 'Z'))] = (tal(r['t2m_c']), m * 100 if m is not None else None,
                                                                   tal(r['nederbord_mm']))

obs = defaultdict(dict)
for fil, p in (('smhi_p1_2024-25.csv.gz', 1), ('smhi_p16_2024-25.csv.gz', 16), ('smhi_p7_2024-25.csv.gz', 7)):
    for r in csv.DictReader(gzip.open(d + '/' + fil, 'rt')):
        if r['kvalitet'] in ('G', 'Y') and r['varde'] != '':
            obs[(r['station_id'], r['tid_utc'].replace('.000Z', 'Z'))][p] = float(r['varde'])

R = {k: defaultdict(list) for k in ('alla', 'norr', 'söder')}
antal = {k: set() for k in R}
for (v, t), e in ec.items():
    m = mn.get((v, t)); o = obs.get((par[v]['smhi'], t))
    if not m or not o:
        continue
    for reg in ('alla', 'norr' if norr[v] else 'söder'):
        antal[reg].add(v)
        x = R[reg]
        if 1 in o and e[0] is not None and m[0] is not None:
            x['t'].append((o[1], e[0], m[0], float(par[v]['km'])))
        if 16 in o and o[16] <= 100 and e[1] is not None and m[1] is not None:
            x['moln'].append((o[16], e[1], m[1]))
        if 7 in o and e[2] is not None and m[2] is not None:
            x['ned'].append((o[7], e[2], m[2]))

def pc(a, b):
    return f"{100 * a / b:5.1f} %" if b else "   –  "

def temp(rows, namn):
    if not rows:
        return
    print(f"{namn}  (n = {len(rows)})")
    for i, k in ((1, 'ECMWF'), (2, 'MET Nordic')):
        fel = [r[i] - r[0] for r in rows]
        print(f"    {k:<11} MAE {sum(map(abs, fel)) / len(fel):4.2f} °C  bias {sum(fel) / len(fel):+5.2f} °C  "
              f"grova (>2 °C) {pc(sum(abs(f) > 2 for f in fel), len(fel))}")

for reg in ('alla', 'norr', 'söder'):
    x = R[reg]
    print(f"\n===== {reg.upper()} — {len(antal[reg])} stationspar =====")
    t = x['t']
    temp(t, 'Lufttemperatur, alla timmar')
    temp([r for r in t if r[0] <= 0], 'Lufttemperatur, timmar med frost (SMHI ≤ 0 °C)')
    temp([r for r in t if -3 <= r[0] <= 2], 'Lufttemperatur, nära noll (−3…+2 °C)')
    mo = x['moln']
    if mo:
        print(f"Molnighet (n = {len(mo)})")
        klar = [r for r in mo if r[0] <= 25]
        for i, k in ((1, 'ECMWF'), (2, 'MET Nordic')):
            mod_klar = sum(r[i] <= 25 for r in mo)
            print(f"    {k:<11} MAE {sum(abs(r[i] - r[0]) for r in mo) / len(mo):5.1f} pe  "
                  f"klar himmel hittad {pc(sum(r[i] <= 25 for r in klar), len(klar))} (av {len(klar)})  "
                  f"falskt klar (SMHI > 50 %) {pc(sum(r[i] <= 25 and r[0] > 50 for r in mo), mod_klar)}")
    ne = x['ned']
    if ne:
        print(f"Nederbörd per timme (n = {len(ne)})")
        tot = sum(r[0] for r in ne); vat = [r for r in ne if r[0] >= 0.1]
        for i, k in ((1, 'ECMWF'), (2, 'MET Nordic')):
            mod = [r for r in ne if r[i] >= 0.1]
            print(f"    {k:<11} regn/snö hittat {pc(sum(r[i] >= 0.1 for r in vat), len(vat))}  "
                  f"falsklarm {pc(sum(r[0] < 0.1 for r in mod), len(mod))}  "
                  f"summa {100 * sum(r[i] for r in ne) / tot:5.0f} % av SMHI:s")

print()
temp([r for r in R['alla']['t'] if r[0] <= -15], 'Sträng kyla (SMHI ≤ −15 °C), alla stationer')

# MET Nordic läser in SMHI:s stationer i sin analys. Krymper försprånget när paret ligger längre isär, är det inläsningen som syns.
print("\nGrova fel i lufttemperaturen per avstånd mellan VViS-punkten och SMHI-stationen")
for lo, hi in ((0, 2), (2, 3.5), (3.5, 5.01)):
    rows = [r for r in R['alla']['t'] if lo <= r[3] < hi]
    n = len(rows)
    if n:
        print(f"    {lo}–{min(hi, 5):g} km (n = {n}): ECMWF {pc(sum(abs(r[1] - r[0]) > 2 for r in rows), n)}, "
              f"MET Nordic {pc(sum(abs(r[2] - r[0]) > 2 for r in rows), n)}")
