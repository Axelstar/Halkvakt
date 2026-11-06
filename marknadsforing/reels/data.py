# Reels (DECISIONS #780): tonight's national picture for reel.html, from halkvakt.se's own files (Trafikverket's open data).
#   python3 marknadsforing/reels/data.py   ->  marknadsforing/reels-ut/nat.js (window.NAT) and sammanfattning.json
# HV_BAS=<url> points at another copy of the site (default https://halkvakt.se/).
import json, math, os, re, urllib.request
import numpy as np
from skimage import measure

BAS = os.environ.get('HV_BAS', 'https://halkvakt.se/')
UT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'reels-ut')
os.makedirs(UT, exist_ok=True)
hamta = lambda p: json.load(urllib.request.urlopen(BAS + p, timeout=60))
lan, vader, vag, summ = hamta('assets/lan.geojson'), hamta('data/vader.geojson')['features'], hamta('data/vaglag.geojson')['features'], hamta('data/lan.json')

# Equirectangular at 62° N, Sweden 1000 units tall.
k = math.cos(math.radians(62))
P = lambda lon, lat: (lon * k, -lat)
polys = lambda g: g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
xs, ys = zip(*[P(x, y) for f in lan['features'] for p in polys(f['geometry']) for x, y in p[0]])
bx0, by0 = min(xs), min(ys); S = 1000 / (max(ys) - by0); W = (max(xs) - bx0) * S
T = lambda lon, lat: (round((P(lon, lat)[0] - bx0) * S, 1), round((P(lon, lat)[1] - by0) * S, 1))
D = lambda ring: 'M' + ' L'.join(f'{a},{b}' for a, b in (T(*p) for p in ring)) + 'Z'

def fara(text, info):
    """Trafikverket's word, never stronger: the same rule as fara() in annonsstyrning.mjs."""
    t = ' '.join([text] + (info or [])).lower()
    if re.search(r'risk för|halkrisk', t): return 'Risk för halka'
    if 'fläckvis is' in t: return 'Fläckvis is'
    if re.search(r'(?<![a-zåäö])(is|halka|halkig|halt|mycket besvärligt)(?![a-zåäö])', t): return 'Halka'
    return 'Risk för halka'

def linjer(g):
    geo = g['geometry']; cs = [geo['coordinates']] if geo['type'] == 'LineString' else geo['coordinates']
    return ''.join('M' + ' L'.join(f'{a},{b}' for a, b in (T(*p) for p in c)) for c in cs)

lans = [{'kod': int(f['properties']['kod']), 'd': ''.join(D(p[0]) for p in polys(f['geometry']))} for f in lan['features']]
sv = [f for f in vader if f['properties'].get('land') == 'SE' and f['properties'].get('yta') is not None]
st = [dict(zip(('x', 'y'), T(*f['geometry']['coordinates'])), yta=f['properties']['yta'], luft=f['properties'].get('luft'), n=f['properties']['name'])
      for f in sv]
roads = []
for g in vag:
    p = g['properties']
    if p['code'] < 2: continue
    c0 = g['geometry']['coordinates'][0] if g['geometry']['type'] == 'LineString' else g['geometry']['coordinates'][0][0]
    roads.append({'d': linjer(g), 'lan': p['lan'], 'road': p['road'].upper().replace('E ', 'E'),
                  'stretch': re.sub(r'^(E \d+|Väg \d+)\s+', '', p['plats']).replace(' - ', '–'),
                  'word': fara(p['text'], p.get('info')), 'y': T(*c0)[1]})
counties = sorted([{k2: l[k2] for k2 in ('kod', 'kort', 'halt', 'kalla', 'kallast')} for l in summ['lan']], key=lambda c: (-c['halt'], -c['kalla']))

# The 0 °C line on the road surface: inverse-distance weights over the six nearest stations, clipped to Sweden.
from matplotlib.path import Path
paths = [Path([P(*c) for c in p[0]]) for f in lan['features'] for p in polys(f['geometry'])]
g = 3.0; GX, GY = np.meshgrid(np.arange(0, W, g), np.arange(0, 1000, g))
Pp = np.array([[s['x'], s['y']] for s in st]); V = np.array([s['yta'] for s in st]); Z = np.zeros_like(GX)
for i in range(GX.shape[0]):
    d = np.hypot(GX[i][:, None] - Pp[:, 0], GY[i][:, None] - Pp[:, 1]) + 1e-6
    idx = np.argsort(d, 1)[:, :6]; w = 1 / np.take_along_axis(d, idx, 1) ** 2
    Z[i] = (w * V[idx]).sum(1) / w.sum(1)
inne = np.zeros(GX.shape, bool); pts = np.c_[GX.ravel() / S + bx0, GY.ravel() / S + by0]
for p in paths: inne |= p.contains_points(pts).reshape(GX.shape)
iso = ['M' + ' L'.join(f'{c[1]*g:.1f},{c[0]*g:.1f}' for c in cc) for cc in measure.find_contours(np.where(inne, Z, 5.0), 0.0) if len(cc) > 6]

under = [s for s in st if s['yta'] < 0]
e4 = [g for g in vag if g['properties']['road'] == 'E 4']
seg = np.array([T(*c) for g in e4 for c in (g['geometry']['coordinates'] if g['geometry']['type'] == 'LineString' else [c for l in g['geometry']['coordinates'] for c in l])])
e4st = sorted([s for s in st if len(seg) and np.min(np.hypot(seg[:, 0] - s['x'], seg[:, 1] - s['y'])) < 1.6], key=lambda s: -s['y'])
# Commuter stretches and cities (Axel 6/11): the stations within reach of a straight line between two towns, south to north,
# and the three stations nearest a city centre. Distances in km on a local flat projection.
km = lambda a, b: math.hypot((a[0] - b[0]) * 111.32 * math.cos(math.radians((a[1] + b[1]) / 2)), (a[1] - b[1]) * 110.57)
LL = [tuple(f['geometry']['coordinates']) for f in sv]
def langs(a, b, bredd=6):
    ut = []
    for i, p in enumerate(LL):
        ax, ay, bx, by = 0, 0, km(a, b), 0
        da, db = km(p, a), km(p, b)
        if da + db - km(a, b) < bredd * 0.5: ut.append((da, i))
    return [i for _, i in sorted(ut)]
PEND = [('Malmö', 'Lund', (13.00, 55.605), (13.19, 55.705)), ('Göteborg', 'Borås', (11.97, 57.71), (12.94, 57.72)),
        ('Uppsala', 'Stockholm', (17.64, 59.86), (18.07, 59.33)), ('Norrköping', 'Linköping', (16.19, 58.59), (15.62, 58.41)),
        ('Gävle', 'Sandviken', (17.14, 60.67), (16.78, 60.62)), ('Umeå', 'Skellefteå', (20.26, 63.83), (20.95, 64.75)),
        ('Jönköping', 'Värnamo', (14.16, 57.78), (14.04, 57.18)), ('Västerås', 'Enköping', (16.54, 59.61), (17.08, 59.64))]
pend = [{'fran': a, 'till': b, 'a': T(*pa), 'b': T(*pb), 'st': langs(pa, pb)} for a, b, pa, pb in PEND]
STAD = [('Malmö', (13.00, 55.605)), ('Göteborg', (11.97, 57.71)), ('Stockholm', (18.07, 59.33)), ('Uppsala', (17.64, 59.86)),
        ('Linköping', (15.62, 58.41)), ('Örebro', (15.21, 59.27)), ('Karlstad', (13.50, 59.38)), ('Sundsvall', (17.31, 62.39)),
        ('Umeå', (20.26, 63.83)), ('Luleå', (22.15, 65.58)), ('Jönköping', (14.16, 57.78)), ('Växjö', (14.81, 56.88))]
stader = [{'n': n, 'xy': T(*p), 'st': sorted(range(len(LL)), key=lambda i: km(LL[i], p))[:3]} for n, p in STAD]
nat = {'pend': pend, 'stader': stader, 'gen': summ['generated_at'], 'W': round(W), 'lan': lans, 'st': st, 'roads': roads, 'counties': counties, 'iso': iso,
       'front': max(under, key=lambda s: s['y']) if under else None, 'top': sorted(under, key=lambda s: s['yta'])[:5],
       'e4': {'d': [linjer(g) for g in e4], 'st': e4st, 'risk': [r for r in roads if r['road'] == 'E4']}}
open(os.path.join(UT, 'nat.js'), 'w').write('window.NAT=' + json.dumps(nat, ensure_ascii=False) + ';')

# What reels.mjs chooses and writes from: counts only, no geometry.
namn = lambda s: re.sub(r'\s+Fjärryta$', '', re.sub(r'^\d+\s+', '', s['n']))
e4kall = next((s for s in e4st if s['yta'] < 0), None)
sam = {'gen': summ['generated_at'], 'stationer': len(st), 'under': len(under), 'iso': len(iso), 'vagar': len(roads),
       'ord': {o: sum(r['word'] == o for r in roads) for o in ('Halka', 'Fläckvis is', 'Risk för halka')},
       'lan': [{'kort': c['kort'], 'halt': c['halt']} for c in counties if c['halt']],
       'top': [{'n': namn(s), 'yta': s['yta']} for s in nat['top']],
       'front': nat['front'] and {'n': namn(nat['front']), 'yta': nat['front']['yta']},
       'e4': {'stationer': len(e4st), 'risk': len(nat['e4']['risk']), 'forstaKall': e4kall and namn(e4kall)}}
# The new films (DECISIONS #806). Same picks as reel.html makes, so the caption names what the film shows.
fj = lambda s: 'Fjärryta' in s['n']
pm = [s for s in st if not fj(s) and s['luft'] is not None and s['luft'] > 0 and s['yta'] < 0]
tp = lambda s: s and {'n': namn(s), 'luft': s['luft'], 'yta': s['yta']}
plus = sorted([s for s in pm if s['luft'] - s['yta'] >= 3], key=lambda s: -s['y'])
gissa = sorted(pm, key=lambda s: abs((s['luft'] - s['yta']) - 4))
pp = sorted([dict(p, s=[st[i] for i in p['st'] if not fj(st[i])]) for p in pend], key=lambda p: -sum(x['yta'] < 0 for x in p['s']))
pp = [p for p in pp if len(p['s']) >= 3]
std = [{'n': c['n'], 's': next((st[i] for i in c['st'] if not fj(st[i])), st[c['st'][0]])} for c in stader]
REG = {'Norra Sverige': [21, 22, 23, 24, 25], 'Mellersta Sverige': [1, 3, 4, 17, 18, 19, 20], 'Södra Sverige': [5, 6, 7, 8, 9, 10, 12, 13, 14]}
sam.update({
    'plusMinus': len(pm), 'plus': tp(plus[0] if plus else (pm[0] if pm else None)), 'gissa': tp(gissa[0] if gissa else None),
    'pendling': pp and {'fran': pp[0]['fran'], 'till': pp[0]['till'], 'stationer': len(pp[0]['s']), 'under': sum(x['yta'] < 0 for x in pp[0]['s'])},
    'stader': {'antal': len(std), 'minus': [c['n'] for c in std if c['s']['yta'] < 0]},
    'regioner': [{'namn': n, 'halt': sum(r['lan'] in k for r in roads)} for n, k in REG.items()]})
json.dump(sam, open(os.path.join(UT, 'sammanfattning.json'), 'w'), ensure_ascii=False, indent=1)
print(f"Reels-data {sam['gen']}: {sam['stationer']} stationer, {sam['under']} under noll, {sam['vagar']} vägavsnitt med halkrisk.")
