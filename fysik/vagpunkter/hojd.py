"""Height and the 1 and 3 km terrain index from the Copernicus DEM, in fetch_elev.py's points (DECISIONS #553, Bengt 13/10: "3 a").

fetch_elev.py asks Open-Meteo's elevation API for 17 points per place (the place, and eight directions at 1 and 3 km) and writes
elev = the place's height, tpi1 / tpi3 = the place minus the mean of its ring. When all 20 tries for a call fail it reuses the previous
call's heights, silently (fysik/fetch_elev.py lines 15-18); the reproduction 13/10 got 78 % equal that way, and for 12 960 points the API
would take some 35 hours. Axel's release is healthy (elev − elev_ifs at most 16 m, 723 of 754 exactly 0). Here the same 17 points read
the Copernicus DEM directly, as geofeat.py does (its z reproduced exactly). Four ways are tried at the stations against the release:
  glo90-bilinjar  GLO-90 (Open-Meteo's DEM), bilinear between the four nearest pixel centres
  glo90-narmast   GLO-90, the pixel the point falls in
  glo30-bilinjar  GLO-30, bilinear
  glo30-3x3       GLO-30, the mean of the 3 × 3 pixels around the point (geofeat.py's z)
The rule, written before the run: the way with the smallest 99th percentile of |elev − release| wins; a tie (within 0.1 m) is broken by
the same for tpi3. A tile missing from the bucket's tileList.txt is open sea and gives 0 m, counted; a listed tile that cannot be
read stops the run, so that a network error never becomes a height (fetch_elev.py's silent reuse is the lesson).
  python3 fysik/vagpunkter/hojd.py hojd --stationer <stations.csv> --metod <way> --ut <elev.csv>
  python3 fysik/vagpunkter/hojd.py jamfor --frusen <release dir> <way>=<elev.csv> ...    the stations, aggregates, and the winner
  python3 fysik/vagpunkter/hojd.py frisk --frusen <release dir>                          the release: elev against elev_ifs and z
  python3 fysik/vagpunkter/hojd.py --sjalvtest                                           synthetic data only; runs in ci.yml
"""
import argparse, glob, os, sys, tempfile
import numpy as np
import pandas as pd

for k, v in dict(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_MAX_RETRY='5',
                 GDAL_HTTP_RETRY_DELAY='3').items():
    os.environ.setdefault(k, v)                       # as geofeat.py reads the same rasters

METODER = ('glo90-bilinjar', 'glo90-narmast', 'glo30-bilinjar', 'glo30-3x3')


def dem_url(la, lo, upplosning):
    kod, hink = ('10', 'copernicus-dem-30m') if upplosning == 30 else ('30', 'copernicus-dem-90m')
    n = f'Copernicus_DSM_COG_{kod}_N{la:02d}_00_E{lo:03d}_00_DEM'
    return f'/vsicurl/https://{hink}.s3.amazonaws.com/{n}/{n}.tif'


def punkter17(meta):
    """fetch_elev.py's points, line for line: (sid, 'c' | 'r1' | 'r3', lat, lon)."""
    pts = []
    for r in meta.itertuples():
        pts.append((r.sid, 'c', r.lat, r.lon))
        for R in (1.0, 3.0):
            for a in range(0, 360, 45):
                dlat = R / 111.0 * np.cos(np.radians(a)); dlon = R / (111.0 * np.cos(np.radians(r.lat))) * np.sin(np.radians(a))
                pts.append((r.sid, f'r{int(R)}', r.lat + dlat, r.lon + dlon))
    return pts


def ur_rutnat(z, rad, kol, metod):
    """Values at fractional pixel coordinates (rad, kol measured from the grid's corner, pixel centres at +0.5)."""
    ny, nx = z.shape
    if metod.endswith('narmast'):
        return z[np.clip(rad.astype(int), 0, ny - 1), np.clip(kol.astype(int), 0, nx - 1)]
    if metod.endswith('3x3'):
        r0, c0 = np.clip(rad.astype(int), 0, ny - 1), np.clip(kol.astype(int), 0, nx - 1)
        return np.array([np.nanmean(z[max(r - 1, 0):r + 2, max(c - 1, 0):c + 2]) for r, c in zip(r0, c0)])
    r, c = np.clip(rad - 0.5, 0, ny - 1), np.clip(kol - 0.5, 0, nx - 1)
    r1, c1 = np.minimum(np.floor(r).astype(int), ny - 2), np.minimum(np.floor(c).astype(int), nx - 2)
    fr, fc = r - r1, c - c1
    return ((1 - fr) * (1 - fc) * z[r1, c1] + (1 - fr) * fc * z[r1, c1 + 1] + fr * (1 - fc) * z[r1 + 1, c1] + fr * fc * z[r1 + 1, c1 + 1])


def sampla(pts, metod, oppna=None):
    """The DEM at every point, one tile at a time. Returns (values, number of points on tiles that do not exist)."""
    lat = np.array([p[2] for p in pts]); lon = np.array([p[3] for p in pts])
    ut = np.zeros(len(pts)); hav = 0
    upp = 90 if metod.startswith('glo90') else 30
    if oppna is None:
        import rasterio, urllib.request
        hink = 'copernicus-dem-90m' if upp == 90 else 'copernicus-dem-30m'
        finns = set(urllib.request.urlopen(f'https://{hink}.s3.amazonaws.com/tileList.txt', timeout=120).read().decode().split())
        def oppna(url):
            if url.split('/')[-2] not in finns:
                return None, None                     # not in the bucket's tile list: open sea
            with rasterio.open(url) as s:             # a listed tile that cannot be read stops the run — never a silent 0
                return s.read(1).astype(float), ~s.transform
    ruta = np.floor(lat).astype(int) * 1000 + np.floor(lon).astype(int)
    for rr in np.unique(ruta):
        ix = np.where(ruta == rr)[0]
        z, inv = oppna(dem_url(int(rr // 1000), int(rr % 1000), upp))
        if z is None:
            hav += len(ix); continue
        z[z < -100] = np.nan
        kol, rad = inv * (lon[ix], lat[ix])
        ut[ix] = ur_rutnat(z, np.asarray(rad, float), np.asarray(kol, float), metod)
    return ut, hav


def hojdtabell(pts, varden):
    """fetch_elev.py's table: elev, tpi1, tpi3 per place."""
    df = pd.DataFrame({'sid': [p[0] for p in pts], 'k': [p[1] for p in pts], 'z': varden})
    c = df[df.k == 'c'].set_index('sid').z
    r1 = df[df.k == 'r1'].groupby('sid').z.mean(); r3 = df[df.k == 'r3'].groupby('sid').z.mean()
    return pd.DataFrame({'elev': c, 'tpi1': c - r1, 'tpi3': c - r3}).reset_index()


def las_ifs(frusen):
    return pd.Series({os.path.basename(f)[:-4]: pd.read_csv(f, usecols=['elev_ifs'], nrows=1).elev_ifs.iloc[0]
                      for f in glob.glob(f'{frusen}/ifs/*.csv')}, dtype=float)


def kvantiler(d):
    q = np.nanpercentile(d, [50, 90, 99, 100]) if np.isfinite(d).any() else [np.nan] * 4
    return f'median {q[0]:.1f} · p90 {q[1]:.1f} · p99 {q[2]:.1f} · max {q[3]:.1f} m'


def jamfor(frusen, varianter, ifs=None):
    """Each way against the release's elev.csv (and elev − elev_ifs against the release's, which is 0 at 96 % of the stations).
    Returns the lines and the winner by the rule in the docstring."""
    fr = pd.read_csv(f'{frusen}/elev.csv', dtype={'sid': str}).set_index('sid')
    ifs = las_ifs(frusen) if ifs is None else ifs
    rader, p99 = [], {}
    fr_diff = (fr.elev - ifs.reindex(fr.index)).abs()
    rader.append(f'releasen: elev − elev_ifs exakt 0 vid {100 * np.mean(fr_diff == 0):.1f} % av {int(fr_diff.notna().sum())} stationer, {kvantiler(fr_diff)}')
    for namn, fil in varianter.items():
        ny = pd.read_csv(fil, dtype={'sid': str}).set_index('sid').reindex(fr.index)
        d = {k: (ny[k] - fr[k]).abs().to_numpy(float) for k in ('elev', 'tpi1', 'tpi3')}
        p99[namn] = (float(np.nanpercentile(d['elev'], 99)), float(np.nanpercentile(d['tpi3'], 99)))
        diff = (ny.elev - ifs.reindex(fr.index)).abs()
        rader.append(f'{namn}: |Δelev| {kvantiler(d["elev"])}; |Δtpi1| {kvantiler(d["tpi1"])}; |Δtpi3| {kvantiler(d["tpi3"])}; '
                     f'elev − elev_ifs exakt 0 vid {100 * np.mean(diff == 0):.1f} %, {kvantiler(diff)}')
    basta = min(p99.values(), key=lambda v: v[0])[0]
    kandidater = [n for n, v in p99.items() if v[0] <= basta + 0.1]
    vinnare = min(kandidater, key=lambda n: p99[n][1])
    rader.append(f'vinnaren enligt regeln (minst p99 |Δelev|, inom 0,1 m skiljer p99 |Δtpi3|): {vinnare} '
                 f'(p99 |Δelev| {p99[vinnare][0]:.1f} m, p99 |Δtpi3| {p99[vinnare][1]:.1f} m)')
    return rader, vinnare


def frisk(frusen):
    """The release's elev against two healthy heights: elev_ifs (Open-Meteo's, the same DEM and place) and geofeat.py's z (GLO-30)."""
    el = pd.read_csv(f'{frusen}/elev.csv', dtype={'sid': str}).set_index('sid')
    gf = pd.read_csv(f'{frusen}/geofeat.csv', dtype={'sid': str}).set_index('sid')
    ifs = las_ifs(frusen)
    s = el.index.intersection(gf.index).intersection(ifs.index)
    d1 = (el.loc[s, 'elev'] - ifs.loc[s]).abs(); d2 = (el.loc[s, 'elev'] - gf.loc[s, 'z']).abs(); d3 = (ifs.loc[s] - gf.loc[s, 'z']).abs()
    return [f'{len(s)} stationer', f'  |elev − elev_ifs| {kvantiler(d1)}; över 50 m {int((d1 > 50).sum())}, exakt 0 {int((d1 == 0).sum())}',
            f'  |elev − z| {kvantiler(d2)}; över 50 m {int((d2 > 50).sum())}',
            f'  |elev_ifs − z| (två friska höjder) {kvantiler(d3)}'], int((d1 > 50).sum())


def sjalvtest():
    fel = []
    meta = pd.DataFrame({'sid': ['a', 'b', 'h'], 'lat': [60.5, 66.5, 60.5], 'lon': [15.5, 20.5, 16.5]})   # h lies on a tile that is sea
    pts = punkter17(meta)
    hav = lambda la1, lo1, la2, lo2: 6371 * 2 * np.arcsin(np.sqrt(np.sin(np.radians(la2 - la1) / 2) ** 2 + np.cos(np.radians(la1)) *
                                                               np.cos(np.radians(la2)) * np.sin(np.radians(lo2 - lo1) / 2) ** 2))
    r1 = [hav(60.5, 15.5, p[2], p[3]) for p in pts if p[0] == 'a' and p[1] == 'r1']
    r3 = [hav(66.5, 20.5, p[2], p[3]) for p in pts if p[0] == 'b' and p[1] == 'r3']
    if len(pts) != 51 or not all(abs(x - 1.0) < 0.02 for x in r1) or not all(abs(x - 3.0) < 0.06 for x in r3): fel.append(f'punkterna: {r1[:2]}, {r3[:2]}')
    z = 100 + 2.0 * np.arange(10)[:, None] + 3.0 * np.arange(12)[None, :]                       # a plane: 2 m per row, 3 m per column
    v = ur_rutnat(z.astype(float), np.array([2.5, 4.0]), np.array([3.5, 6.25]), 'glo30-bilinjar')
    if not np.allclose(v, [100 + 2 * 2 + 3 * 3, 100 + 2 * 3.5 + 3 * 5.75]): fel.append(f'bilinjärt på ett plan: {v}')
    if ur_rutnat(z.astype(float), np.array([2.9]), np.array([3.1]), 'glo90-narmast')[0] != z[2, 3]: fel.append('närmast tar pixeln punkten ligger i')
    if abs(ur_rutnat(z.astype(float), np.array([5.5]), np.array([5.5]), 'glo30-3x3')[0] - z[5, 5]) > 1e-9: fel.append('3x3 på ett plan är mitten')
    plan = lambda la, lo: 100 + 10 * (la - 60) * 111                                            # 10 m per km north
    skal = lambda la, lo: ((la - 60.5) * 111) ** 2 + ((lo - 15.5) * 111 * np.cos(np.radians(60.5))) ** 2   # a bowl around station a
    for namn, f, tpi in [('plan', plan, 0.0), ('skål', skal, None)]:
        t = hojdtabell(pts, np.array([f(p[2], p[3]) for p in pts])).set_index('sid')
        if tpi == 0.0 and not (abs(t.loc['a', 'tpi1']) < 1e-6 and abs(t.loc['a', 'tpi3']) < 1e-6): fel.append(f'tpi på ett plan är 0: {t.loc["a"].tolist()}')
        if tpi is None and not (t.loc['a', 'tpi1'] < 0 and t.loc['a', 'tpi3'] < t.loc['a', 'tpi1']): fel.append(f'tpi i en skål är negativ och djupare ut: {t.loc["a"].tolist()}')
    class Lin:                                      # a tile's inverse geotransform without rasterio: (lon, lat) → (column, row)
        def __init__(self, la, lo, n): self.la, self.lo, self.n = la, lo, n
        def __mul__(self, xy): return ((xy[0] - self.lo) * self.n, (self.la + 1 - xy[1]) * self.n)
    def oppna(url):
        la, lo = int(url.split('_N')[1][:2]), int(url.split('_E')[1][:3])
        if (la, lo) == (60, 16): return None, None    # open sea: no tile
        n = 120; rad, kol = np.mgrid[0:n, 0:n] + 0.5
        return plan(la + 1 - rad / n, lo + kol / n).astype(float), Lin(la, lo, n)
    v, hav_n = sampla(pts, 'glo90-bilinjar', oppna)
    ref = np.array([plan(p[2], p[3]) for p in pts])
    ok = np.array([not (60 <= p[2] < 61 and 16 <= p[3] < 17) for p in pts])
    if not (np.allclose(v[ok], ref[ok], atol=1e-6) and hav_n == int((~ok).sum()) and np.all(v[~ok] == 0)):
        fel.append(f'sampla: största fel {np.max(np.abs(v[ok] - ref[ok])):.2e}, havspunkter {hav_n} av {int((~ok).sum())}')
    if 'copernicus-dem-90m' not in dem_url(59, 18, 90) or 'COG_10_N59_00_E018' not in dem_url(59, 18, 30): fel.append('adresserna')
    with tempfile.TemporaryDirectory() as d:
        os.makedirs(f'{d}/fr/ifs')
        s = [f'{i:04d}' for i in range(60)]
        elev = 100 + 37 * np.arange(60.0)
        pd.DataFrame({'sid': s, 'elev': elev, 'tpi1': 1.0, 'tpi3': 2.0}).to_csv(f'{d}/fr/elev.csv', index=False)
        pd.DataFrame({'sid': s, 'z': elev + 1.0}).to_csv(f'{d}/fr/geofeat.csv', index=False)
        for i, x in enumerate(s): pd.DataFrame({'elev_ifs': [elev[i]]}).to_csv(f'{d}/fr/ifs/{x}.csv', index=False)
        pd.DataFrame({'sid': s, 'elev': elev + 0.5, 'tpi1': 1.0, 'tpi3': 2.4}).to_csv(f'{d}/a.csv', index=False)
        pd.DataFrame({'sid': s, 'elev': elev + 0.55, 'tpi1': 1.0, 'tpi3': 2.1}).to_csv(f'{d}/b.csv', index=False)
        pd.DataFrame({'sid': s, 'elev': elev + 5.0, 'tpi1': 1.0, 'tpi3': 2.0}).to_csv(f'{d}/c.csv', index=False)
        rader, vinnare = jamfor(f'{d}/fr', {'a': f'{d}/a.csv', 'b': f'{d}/b.csv', 'c': f'{d}/c.csv'})
        if vinnare != 'b': fel.append(f'regeln: inom 0,1 m vinner minst p99 |Δtpi3| ({vinnare}); {rader[-1]}')
        if not rader[0].startswith('releasen: elev − elev_ifs exakt 0 vid 100.0 %'): fel.append(f'releasens elev_diff: {rader[0]}')
        e2 = elev.copy(); e2[10:16] = elev[0:6]                                   # one stale block of six stations
        pd.DataFrame({'sid': s, 'elev': e2, 'tpi1': 1.0, 'tpi3': 2.0}).to_csv(f'{d}/fr/elev.csv', index=False)
        _, n50 = frisk(f'{d}/fr')
        if n50 != 6: fel.append(f'frisk: ett förskjutet block om sex stationer ger {n50} över 50 m')
    for f in fel: print('✗', f)
    if fel: sys.exit(1)
    print('✓ självtest: fetch_elev.py:s 17 punkter (1 och 3 km), bilinjärt, närmast och 3×3 på ett plan, tpi 0 på ett plan och negativ i '
          'en skål, rutorna läses en i taget och havet ger 0 och räknas, regeln väljer vinnaren, och ett förskjutet block i releasen syns')


if __name__ == '__main__':
    if '--sjalvtest' in sys.argv:
        sjalvtest(); sys.exit(0)
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest='cmd', required=True)
    a1 = sp.add_parser('hojd'); a1.add_argument('--stationer', required=True); a1.add_argument('--metod', choices=METODER, required=True); a1.add_argument('--ut', required=True)
    a2 = sp.add_parser('jamfor'); a2.add_argument('--frusen', required=True); a2.add_argument('varianter', nargs='+', help='<metod>=<elev.csv>')
    a3 = sp.add_parser('frisk'); a3.add_argument('--frusen', required=True)
    a = ap.parse_args()
    if a.cmd == 'hojd':
        meta = pd.read_csv(a.stationer, dtype={'sid': str})
        pts = punkter17(meta)
        v, hav = sampla(pts, a.metod)
        hojdtabell(pts, v).to_csv(a.ut, index=False)
        print(f'{a.ut}: {len(meta)} platser, {len(pts)} punkter ur {a.metod}, {hav} på rutor som inte finns (öppet hav, 0 m)')
    elif a.cmd == 'jamfor':
        rader, _ = jamfor(a.frusen, dict(x.split('=', 1) for x in a.varianter))
        print('HÖJDEN UR COPERNICUS DEM MOT RELEASEN (DECISIONS #553), vid stationerna'); [print(' ', r) for r in rader]
    else:
        rader, n50 = frisk(a.frusen)
        print('RELEASENS HÖJD MOT TVÅ FRISKA HÖJDER (DECISIONS #553)'); [print(r) for r in rader]
        print('releasen är frisk' if n50 == 0 else f'RELEASEN BÄR {n50} FÖRSKJUTNA HÖJDER')
