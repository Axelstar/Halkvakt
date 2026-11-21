# Sveriges kontur och större orter ur Natural Earth (public domain), till appens fil.
import json, sys, math
src, ut = sys.argv[1], sys.argv[2]
lander = json.load(open(src + '/ne_10m_admin_0_countries.geojson', encoding='utf-8'))
se = [f for f in lander['features'] if f['properties'].get('ADM0_A3') == 'SWE'][0]
g = se['geometry']
polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]

def dp(pts, eps):
    # Douglas–Peucker i grader, med longituden krympt till Sveriges breddgrad.
    if len(pts) < 3: return pts
    k = math.cos(math.radians(62))
    def d(p, a, b):
        ax, ay, bx, by, px, py = a[0]*k, a[1], b[0]*k, b[1], p[0]*k, p[1]
        dx, dy = bx-ax, by-ay
        l2 = dx*dx + dy*dy
        if l2 == 0: return math.hypot(px-ax, py-ay)
        t = max(0, min(1, ((px-ax)*dx + (py-ay)*dy) / l2))
        return math.hypot(px-(ax+t*dx), py-(ay+t*dy))
    keep = [False]*len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts)-1)]
    while stack:
        i, j = stack.pop()
        m, mi = 0, -1
        for n in range(i+1, j):
            x = d(pts[n], pts[i], pts[j])
            if x > m: m, mi = x, n
        if m > eps:
            keep[mi] = True; stack += [(i, mi), (mi, j)]
    return [p for p, k_ in zip(pts, keep) if k_]

def area(r):
    return abs(sum(r[i][0]*r[i+1][1] - r[i+1][0]*r[i][1] for i in range(len(r)-1))) / 2

ringar = []
for p in polys:
    yttre = p[0]
    if area(yttre) < 0.02: continue          # småöar syns inte på en telefon
    f = dp(yttre, 0.02)
    if len(f) >= 4: ringar.append([[round(x, 3), round(y, 3)] for x, y in f])
ringar.sort(key=lambda r: -len(r))

orter_src = json.load(open(src + '/ne_10m_populated_places_simple.geojson', encoding='utf-8'))
orter = []
for f in orter_src['features']:
    pr = f['properties']
    if pr.get('adm0_a3') != 'SWE': continue
    x, y = f['geometry']['coordinates']
    orter.append({'n': {'Vannersborg': 'Vänersborg'}.get(pr.get('name'), pr.get('name')), 'c': [round(x, 4), round(y, 4)], 'inv': int(pr.get('pop_max') or 0)})
orter.sort(key=lambda o: -o['inv'])
json.dump({'kontur': ringar, 'orter': [{'n': o['n'], 'c': o['c']} for o in orter]}, open(ut, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('ringar', len(ringar), 'punkter', sum(len(r) for r in ringar), 'orter', len(orter))
print(', '.join(o['n'] for o in orter))
