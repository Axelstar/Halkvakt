"""The small roads' random sample and its span against the stations (kort #367, DECISIONS #756-#761).

Step 1 of the small-roads plan reads no outcome: where do points on the roads Trafikverket does not judge lie in the correction's
fixed features, compared with the stations the correction was trained on? This file draws the points and compares the spans; the
features themselves come from Axel's frozen scripts in .github/workflows/vagpunkter-sardrag.yml (input punkter), as for the 12 960
road-condition points (#553).

THE DRAW, written before it was run (DECISIONS #761):
  - the source is Lastkajen's Sverigepaket Drift och underhåll (CC0, the package of #553), layer SverigePaket_DoU, SWEREF99 TM;
  - car roads only (Vagtr_474 = 1, the car network) and no ferry routes (Farje_139 empty);
  - P1: state roads (Vagha_6 = 1) farther than 2 km from every one of the 12 960 road-condition points; P3: municipal roads
    (Vagha_6 = 2), wherever they lie (#758);
  - each point uniform over the road kilometres of its population: a segment drawn with probability proportional to its length
    (ExtLen), then a uniform position along its geometry; a P1 draw within 2 km of the network is thrown away and drawn again;
  - n points per population and one fixed seed, so the draw repeats exactly from the same package.

  python fysik/vagpunkter/urval.py dra --gpkg <SverigePaket.gpkg> --ut data/vagdata/smavagspunkter-urval.json [--n 1000] [--fro 20261031]
  python fysik/vagpunkter/urval.py spann --punkter <urval.json> --sardrag <vagpunkter-sardrag.csv> --frusen <dir> [--road-all <csv>]
  python fysik/vagpunkter/urval.py --sjalvtest      standard library only; runs in ci.yml

Only the standard library, so that the draw runs where the package lies (Bengt's computer) without numpy or GDAL.
"""
import argparse, ast, bisect, csv, glob, hashlib, json, math, os, random, sqlite3, struct, sys, tempfile

ROT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
VAGLAGSPUNKTER = f'{ROT}/data/vagdata/vaglagspunkter.json'
LAGER = 'SverigePaket_DoU'
POPULATIONER = {'P1': 1, 'P3': 2}          # Vagha_6: 1 statlig, 2 kommunal, 3 enskild (NVDB Väghållartyp)
NATET_M = 2000.0                            # P1: farther than this from every road-condition point (#756, #758)
FALT = {'kommun': 'Kommu_140', 'adt_fordon': 'ADT_f_117', 'klass': 'Klass_181', 'vinterklass': 'Vagkl_564', 'element_id': 'ROUTE_ID'}

# ---- SWEREF99 TM <-> WGS84 (GRS80), Lantmäteriet's Gauss-Krüger formulas ----
_A, _F, _LON0, _K0, _FE = 6378137.0, 1 / 298.257222101, 15.0, 0.9996, 500000.0
_E2 = _F * (2 - _F)
_N = _F / (2 - _F)
_AR = _A / (1 + _N) * (1 + _N ** 2 / 4 + _N ** 4 / 64)


def till_sweref(lat, lon):
    """WGS84 degrees -> (northing, easting) in metres."""
    e2, n = _E2, _N
    A = e2; B = (5 * e2 ** 2 - e2 ** 3) / 6; C = (104 * e2 ** 3 - 45 * e2 ** 4) / 120; D = 1237 * e2 ** 4 / 1260
    b1 = n / 2 - 2 * n ** 2 / 3 + 5 * n ** 3 / 16 + 41 * n ** 4 / 180
    b2 = 13 * n ** 2 / 48 - 3 * n ** 3 / 5 + 557 * n ** 4 / 1440
    b3 = 61 * n ** 3 / 240 - 103 * n ** 4 / 140
    b4 = 49561 * n ** 4 / 161280
    p = math.radians(lat); dl = math.radians(lon - _LON0)
    s = math.sin(p)
    ps = p - s * math.cos(p) * (A + B * s ** 2 + C * s ** 4 + D * s ** 6)
    xi = math.atan(math.tan(ps) / math.cos(dl)); eta = math.atanh(math.cos(ps) * math.sin(dl))
    x = _K0 * _AR * (xi + b1 * math.sin(2 * xi) * math.cosh(2 * eta) + b2 * math.sin(4 * xi) * math.cosh(4 * eta)
                     + b3 * math.sin(6 * xi) * math.cosh(6 * eta) + b4 * math.sin(8 * xi) * math.cosh(8 * eta))
    y = _K0 * _AR * (eta + b1 * math.cos(2 * xi) * math.sinh(2 * eta) + b2 * math.cos(4 * xi) * math.sinh(4 * eta)
                     + b3 * math.cos(6 * xi) * math.sinh(6 * eta) + b4 * math.cos(8 * xi) * math.sinh(8 * eta)) + _FE
    return x, y


def till_wgs84(x, y):
    """(northing, easting) in metres -> WGS84 (lat, lon) in degrees."""
    e2, n = _E2, _N
    d1 = n / 2 - 2 * n ** 2 / 3 + 37 * n ** 3 / 96 - n ** 4 / 360
    d2 = n ** 2 / 48 + n ** 3 / 15 - 437 * n ** 4 / 1440
    d3 = 17 * n ** 3 / 480 - 37 * n ** 4 / 840
    d4 = 4397 * n ** 4 / 161280
    As = e2 + e2 ** 2 + e2 ** 3 + e2 ** 4
    Bs = -(7 * e2 ** 2 + 17 * e2 ** 3 + 30 * e2 ** 4) / 6
    Cs = (224 * e2 ** 3 + 889 * e2 ** 4) / 120
    Ds = -(4279 * e2 ** 4) / 1260
    xi = x / (_K0 * _AR); eta = (y - _FE) / (_K0 * _AR)
    xp = xi - d1 * math.sin(2 * xi) * math.cosh(2 * eta) - d2 * math.sin(4 * xi) * math.cosh(4 * eta) \
        - d3 * math.sin(6 * xi) * math.cosh(6 * eta) - d4 * math.sin(8 * xi) * math.cosh(8 * eta)
    ep = eta - d1 * math.cos(2 * xi) * math.sinh(2 * eta) - d2 * math.cos(4 * xi) * math.sinh(4 * eta) \
        - d3 * math.cos(6 * xi) * math.sinh(6 * eta) - d4 * math.cos(8 * xi) * math.sinh(8 * eta)
    ps = math.asin(math.sin(xp) / math.cosh(ep)); dl = math.atan(math.sinh(ep) / math.cos(xp))
    s = math.sin(ps)
    p = ps + s * math.cos(ps) * (As + Bs * s ** 2 + Cs * s ** 4 + Ds * s ** 6)
    return math.degrees(p), _LON0 + math.degrees(dl)


# ---- GeoPackage geometry: header + WKB (lines only) ----
def linjer(blob):
    """The GeoPackage blob as a list of lines, each a list of (easting, northing). LineString or MultiLineString, 2D/Z/M/ZM."""
    if blob[:2] != b'GP': raise ValueError('inte en GeoPackage-geometri')
    env = (blob[3] >> 1) & 7
    pos = 8 + {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}[env]
    ut = []

    def las(pos):
        bo = '<' if blob[pos] == 1 else '>'
        typ = struct.unpack_from(bo + 'I', blob, pos + 1)[0]; pos += 5
        z = bool(typ & 0x80000000) or (typ % 10000) // 1000 in (1, 3)
        m = bool(typ & 0x40000000) or (typ % 10000) // 1000 in (2, 3)
        bas = (typ & 0x0FFFFFFF) % 1000
        dim = 2 + z + m
        if bas == 2:
            k = struct.unpack_from(bo + 'I', blob, pos)[0]; pos += 4
            pkt = [struct.unpack_from(bo + 'd' * dim, blob, pos + i * 8 * dim)[:2] for i in range(k)]
            ut.append(pkt)
            return pos + k * 8 * dim
        if bas == 5:
            k = struct.unpack_from(bo + 'I', blob, pos)[0]; pos += 4
            for _ in range(k): pos = las(pos)
            return pos
        raise ValueError(f'geometritypen {typ} är ingen linje')

    las(pos)
    return ut


def langd(linje):
    return sum(math.dist(linje[i], linje[i + 1]) for i in range(len(linje) - 1))


def punkt_langs(lista, t):
    """The point at fraction t (0..1) of the lines' total length, as (easting, northing)."""
    tot = sum(langd(l) for l in lista)
    kvar = t * tot
    for l in lista:
        for i in range(len(l) - 1):
            d = math.dist(l[i], l[i + 1])
            if kvar <= d or (l is lista[-1] and i == len(l) - 2):
                f = 0.0 if d == 0 else min(1.0, kvar / d)
                return (l[i][0] + f * (l[i + 1][0] - l[i][0]), l[i][1] + f * (l[i + 1][1] - l[i][1]))
            kvar -= d
    return lista[-1][-1]


class Rutnat:
    """The road-condition points in SWEREF99 TM in 2 km cells, for 'nearer than 2 km to any of them'."""
    def __init__(self, punkter_en, cell=NATET_M):
        self.cell = cell; self.c = {}
        for e, nn in punkter_en:
            self.c.setdefault((int(e // cell), int(nn // cell)), []).append((e, nn))

    def narmare_an(self, e, nn, grans=NATET_M):
        ce, cn = int(e // self.cell), int(nn // self.cell)
        for de in (-1, 0, 1):
            for dn in (-1, 0, 1):
                for p in self.c.get((ce + de, cn + dn), ()):
                    if math.dist(p, (e, nn)) < grans: return True
        return False


def dra(gpkg, ut, n=1000, fro=20261031, vaglagspunkter=VAGLAGSPUNKTER):
    db = sqlite3.connect(f'file:{gpkg}?mode=ro', uri=True)
    vp = json.load(open(vaglagspunkter, encoding='utf-8'))['rader']
    natet = Rutnat([till_sweref(p['lat'], p['lon'])[::-1] for p in vp])
    rng = random.Random(fro)
    rader, statistik = [], {}
    for pop, kod in POPULATIONER.items():
        seg = db.execute(f'SELECT id, ExtLen FROM {LAGER} WHERE Vagha_6 = ? AND Vagtr_474 = 1 AND Farje_139 IS NULL AND ExtLen > 0 '
                         'ORDER BY id', (kod,)).fetchall()
        ids = [s[0] for s in seg]; kum = []
        tot = 0.0
        for s in seg: tot += s[1]; kum.append(tot)
        fick, forsok, nara = 0, 0, 0
        while fick < n:
            forsok += 1
            i = bisect.bisect_left(kum, rng.random() * tot)
            t = rng.random()
            rad = db.execute(f'SELECT geom, {", ".join(FALT.values())} FROM {LAGER} WHERE id = ?', (ids[i],)).fetchone()
            e, nn = punkt_langs(linjer(rad[0]), t)
            if pop == 'P1' and natet.narmare_an(e, nn):
                nara += 1; continue
            lat, lon = till_wgs84(nn, e)
            fick += 1
            r = {'id': f'{pop}-{fick:04d}', 'population': pop, 'lon': round(lon, 6), 'lat': round(lat, 6)}
            for k, v in zip(FALT, rad[1:]): r[k] = v
            rader.append(r)
        statistik[pop] = {'segment': len(seg), 'km': round(tot / 1000), 'dragningar': forsok, 'inom_2_km_av_natet': nara}
    db.close()
    sha = hashlib.sha256()
    with open(gpkg, 'rb') as fh:
        for bit in iter(lambda: fh.read(1 << 22), b''): sha.update(bit)
    huvud = {'kalla': "Trafikverket, Lastkajen: Sverigepaket Drift och underhåll (CC0), lagret SverigePaket_DoU; urvalet ur "
                      "fysik/vagpunkter/urval.py (kort #367, DECISIONS #761)",
             'gpkg_sha256': sha.hexdigest(), 'fro': fro, 'n_per_population': n, 'natet_m': NATET_M,
             'regel': 'bilvägar (Vagtr_474 = 1) utan färjeleder; P1 statliga (Vagha_6 = 1) längre än 2 km från varje väglagspunkt, '
                      'P3 kommunala (Vagha_6 = 2); varje punkt likformig över populationens vägkilometer',
             'populationer': statistik, 'platser': len(rader)}
    tmp = f'{ut}.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('{"huvud": ' + json.dumps(huvud, ensure_ascii=False) + ',\n "rader": [\n')
        fh.write(',\n'.join(json.dumps(r, ensure_ascii=False) for r in rader) + '\n]}\n')
    os.replace(tmp, ut)
    return huvud


# ---- the span: the sample's fixed features against the stations' ----
def rattelsens_kolumner(fil=f'{ROT}/fysik/vagpunkter/vagpunkter.py'):
    """RATTELSEN read from vagpunkter.py's source (one list in one place), without importing numpy and pandas."""
    for nod in ast.parse(open(fil, encoding='utf-8').read()).body:
        if isinstance(nod, ast.Assign) and any(getattr(t, 'id', None) == 'RATTELSEN' for t in nod.targets):
            return ast.literal_eval(nod.value)
    raise ValueError('RATTELSEN saknas i vagpunkter.py')


def las_csv(fil):
    with open(fil, encoding='utf-8', newline='') as fh:
        return list(csv.DictReader(fh))


def tal(v):
    try:
        x = float(v)
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


def stationernas_varden(frusen, fil, kol):
    """The stations' values of one column from the frozen release (elev_ifs from ifs/<sid>.csv when elev_ifs.csv is absent)."""
    if os.path.exists(f'{frusen}/{fil}'):
        return [x for x in (tal(r.get(kol)) for r in las_csv(f'{frusen}/{fil}')) if x is not None]
    if kol == 'elev_ifs' and os.path.isdir(f'{frusen}/ifs'):
        ut = []
        for f in sorted(glob.glob(f'{frusen}/ifs/*.csv')):
            with open(f, encoding='utf-8', newline='') as fh:
                r = next(csv.DictReader(fh), None)
            x = tal(r.get('elev_ifs')) if r else None
            if x is not None: ut.append(x)
        return ut
    return []


def spann(punkter, sardrag, frusen, road_all=None):
    """Per population: for each correction column the share of points outside the stations' min-max, and the share outside in
    at least one column. Aggregates only. Returns the lines."""
    pop = {r['id']: r['population'] for r in json.load(open(punkter, encoding='utf-8'))['rader']}
    rader = las_csv(sardrag)
    for r in rader:
        if r['id'] not in pop: raise ValueError(f'{r["id"]}: punkten finns inte i urvalet')
    ut = [f'SPANNET (kort #367, DECISIONS #761): {len(rader)} punkter mot stationernas min–max i den frusna releasen']
    utanfor = {r['id']: False for r in rader}
    per = {}
    for fil, kols in rattelsens_kolumner().items():
        for kol in kols:
            st = stationernas_varden(frusen, fil, kol)
            if not st:
                ut.append(f'  {kol}: stationernas värden saknas i releasen — inte prövat'); continue
            lo, hi = min(st), max(st)
            for r in rader:
                x = tal(r.get(kol))
                if x is not None and (x < lo or x > hi):
                    utanfor[r['id']] = True
                    per.setdefault((pop[r['id']], kol), 0)
                    per[(pop[r['id']], kol)] += 1
            delar = []
            for p in sorted(set(pop.values())):
                n_p = sum(1 for r in rader if pop[r['id']] == p)
                saknas = sum(1 for r in rader if pop[r['id']] == p and tal(r.get(kol)) is None)
                delar.append(f'{p} {per.get((p, kol), 0)} av {n_p} utanför' + (f', {saknas} saknas' if saknas else ''))
            ut.append(f'  {kol} [{lo:g}, {hi:g}]: ' + '; '.join(delar))
    for p in sorted(set(pop.values())):
        n_p = sum(1 for r in rader if pop[r['id']] == p)
        u = sum(1 for r in rader if pop[r['id']] == p and utanfor[r['id']])
        ut.append(f'{p}: {u} av {n_p} punkter ({100 * u / n_p:.1f} %) utanför stationernas spann i minst en kolumn')
    if road_all and os.path.exists(road_all):
        st = las_csv(road_all)
        urval = json.load(open(punkter, encoding='utf-8'))['rader']
        for falt, kol in (('adt_fordon', 'Trafik_Adt_samtliga_fordon'), ('klass', 'FunkVagklass_Klass')):
            v = [x for x in (tal(r.get(kol)) for r in st) if x is not None]
            if not v:
                ut.append(f'  {falt}: kolumnen {kol} saknas i road_all.csv — inte prövat'); continue
            lo, hi = min(v), max(v)
            for p in sorted(set(pop.values())):
                xs = [tal(r.get(falt)) for r in urval if r['population'] == p]
                saknas = sum(1 for x in xs if x is None)
                under = sum(1 for x in xs if x is not None and x < lo); over = sum(1 for x in xs if x is not None and x > hi)
                ut.append(f'  {falt} [{lo:g}, {hi:g}] {p}: {under} under, {over} över, {saknas} saknas av {len(xs)}')
    return ut


def sjalvtest():
    fel = []
    # the projection: round trip within a millimetre over Sweden, and the central meridian at easting 500 000
    for lat in (55.3, 59.33, 63.8, 68.4):
        for lon in (11.0, 15.0, 18.07, 23.9):
            x, y = till_sweref(lat, lon); la, lo = till_wgs84(x, y)
            if math.dist(till_sweref(la, lo), (x, y)) > 1e-3 or abs(la - lat) > 1e-8 or abs(lo - lon) > 1e-8:
                fel.append(f'fram och tillbaka vid {lat}, {lon}')
    if abs(till_sweref(60.0, 15.0)[1] - 500000.0) > 1e-6: fel.append('mittmeridianen ger 500 000 i öster')
    if not (6650000 < till_sweref(60.0, 15.0)[0] < 6660000): fel.append(f'60° N ligger kring 6 653 km norrut: {till_sweref(60.0, 15.0)[0]:.0f}')
    # the geometry: a GeoPackage LineString Z with an envelope, and a MultiLineString without
    ls = struct.pack('<BI', 1, 1002) + struct.pack('<I', 3) + struct.pack('<9d', 0, 0, 5, 3, 4, 5, 3, 10, 5)
    blob = b'GP' + bytes([0, 0x03]) + struct.pack('<i', 3006) + struct.pack('<4d', 0, 3, 0, 10) + ls
    l = linjer(blob)
    if l != [[(0.0, 0.0), (3.0, 4.0), (3.0, 10.0)]] or abs(langd(l[0]) - 11.0) > 1e-12: fel.append(f'LineString Z: {l}')
    if punkt_langs(l, 0.5) != (3.0, 4.5) or punkt_langs(l, 1.0) != (3.0, 10.0): fel.append(f'punkten längs linjen: {punkt_langs(l, 0.5)}')
    mls = struct.pack('<BI', 1, 5) + struct.pack('<I', 2) + b''.join(
        struct.pack('<BI', 1, 2) + struct.pack('<I', 2) + struct.pack('<4d', *c) for c in ((0, 0, 1, 0), (5, 5, 5, 7)))
    if linjer(b'GP' + bytes([0, 0x01]) + struct.pack('<i', 3006) + mls) != [[(0.0, 0.0), (1.0, 0.0)], [(5.0, 5.0), (5.0, 7.0)]]:
        fel.append('MultiLineString')
    # the draw: a little package in memory; P1 stays 2 km from the network, P3 does not, and the same seed gives the same points
    with tempfile.TemporaryDirectory() as d:
        g = f'{d}/p.gpkg'; db = sqlite3.connect(g)
        db.execute(f'CREATE TABLE {LAGER} (id INTEGER, geom BLOB, ExtLen REAL, Vagha_6 INT, Vagtr_474 INT, Farje_139 TEXT, '
                   + ', '.join(f'{v} TEXT' for v in FALT.values()) + ')')
        x0, y0 = till_sweref(60.0, 15.0)

        def lin(e1, n1, e2, n2):
            return b'GP' + bytes([0, 0x01]) + struct.pack('<i', 3006) + struct.pack('<BI', 1, 2) + struct.pack('<I', 2) + struct.pack('<4d', e1, n1, e2, n2)
        rader = [(1, lin(y0, x0, y0 + 1000, x0), 1000, 1, 1, None), (2, lin(y0 + 10000, x0, y0 + 11000, x0), 1000, 1, 1, None),
                 (3, lin(y0, x0, y0, x0 + 1000), 1000, 2, 1, None), (4, lin(y0, x0, y0, x0 + 500), 500, 2, 2, None),
                 (5, lin(y0, x0, y0 + 500, x0), 500, 1, 1, 'färja')]
        for r in rader: db.execute(f'INSERT INTO {LAGER} VALUES (?,?,?,?,?,?,?,?,?,?,?)', r + ('Prov', '100', '4', '5', 'E1'))
        db.commit(); db.close()
        la, lo = till_wgs84(x0, y0)
        json.dump({'rader': [{'id': 'v', 'lon': lo, 'lat': la}]}, open(f'{d}/v.json', 'w'))
        h1 = dra(g, f'{d}/u1.json', n=20, fro=7, vaglagspunkter=f'{d}/v.json')
        h2 = dra(g, f'{d}/u2.json', n=20, fro=7, vaglagspunkter=f'{d}/v.json')
        u1 = json.load(open(f'{d}/u1.json', encoding='utf-8'))
        if open(f'{d}/u1.json', 'rb').read() != open(f'{d}/u2.json', 'rb').read(): fel.append('samma frö ger samma punkter')
        p1 = [r for r in u1['rader'] if r['population'] == 'P1']; p3 = [r for r in u1['rader'] if r['population'] == 'P3']
        if len(p1) != 20 or len(p3) != 20: fel.append(f'tjugo per population: {len(p1)}, {len(p3)}')
        if any(math.dist(till_sweref(r['lat'], r['lon']), (x0, y0)) < NATET_M for r in p1): fel.append('P1 håller 2 km från nätet')
        if h1['populationer']['P1']['inom_2_km_av_natet'] == 0: fel.append('dragningar nära nätet räknas')
        if h1['populationer']['P1']['segment'] != 2 or h1['populationer']['P3']['segment'] != 1: fel.append(f'cykelvägar och färjor ute: {h1["populationer"]}')
        if p3[0]['kommun'] != 'Prov' or p3[0]['element_id'] != 'E1': fel.append(f'fälten följer med: {p3[0]}')
        # the span against a little frozen release
        os.makedirs(f'{d}/fr')
        with open(f'{d}/fr/geofeat.csv', 'w', newline='') as fh: fh.write('sid,svf\nA,0.5\nB,0.9\n')
        with open(f'{d}/s.csv', 'w', newline='') as fh:
            fh.write('sid,id,lon,lat,svf\n' + ''.join(f'{i:05d},{r["id"]},0,0,{0.95 if i < 3 else 0.7}\n' for i, r in enumerate(u1['rader'])))
        s = spann(f'{d}/u1.json', f'{d}/s.csv', f'{d}/fr')
        if not any('svf [0.5, 0.9]: P1 3 av 20 utanför' in x for x in s) or not any(x.startswith('P1: 3 av 20') for x in s) \
                or not any('elev: stationernas värden saknas' in x for x in s): fel.append(f'spannet: {s}')
    for f in fel: print('✗', f)
    if fel: sys.exit(1)
    print('✓ självtest: SWEREF99 TM fram och tillbaka inom en millimeter, GeoPackage-linjer (Z, multi) läses, punkten längs linjen, '
          'urvalet håller P1 2 km från nätet och tar bara bilvägar utan färjor, samma frö ger samma fil, och spannet räknar punkter '
          'utanför stationernas min–max per population')


if __name__ == '__main__':
    if '--sjalvtest' in sys.argv:
        sjalvtest(); sys.exit(0)
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest='cmd', required=True)
    a1 = sp.add_parser('dra'); a1.add_argument('--gpkg', required=True); a1.add_argument('--ut', required=True)
    a1.add_argument('--n', type=int, default=1000); a1.add_argument('--fro', type=int, default=20261031)
    a2 = sp.add_parser('spann'); a2.add_argument('--punkter', required=True); a2.add_argument('--sardrag', required=True)
    a2.add_argument('--frusen', required=True); a2.add_argument('--road-all')
    a = ap.parse_args()
    if a.cmd == 'dra':
        h = dra(a.gpkg, a.ut, a.n, a.fro)
        print(json.dumps({k: h[k] for k in ('platser', 'populationer', 'gpkg_sha256')}, ensure_ascii=False))
    else:
        for rad in spann(a.punkter, a.sardrag, a.frusen, a.road_all): print(rad)
