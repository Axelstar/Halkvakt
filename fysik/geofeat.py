"""Per-station site features for a virtual thermal map, from open rasters read remotely (COG range requests).
Copernicus DEM GLO-30, ESA WorldCover 10 m, Meta/WRI canopy height 1 m, Halkvakt bridges."""
import os, math, json, sys
os.environ.update(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',
                  CURL_CA_BUNDLE='/root/.ccr/ca-bundle.crt', GDAL_HTTP_MAX_RETRY='5', GDAL_HTTP_RETRY_DELAY='3',
                  GDAL_HTTP_TIMEOUT='60')
import numpy as np, pandas as pd, rasterio
from rasterio.merge import merge
from rasterio.windows import from_bounds
from rasterio.warp import transform as wtransform
from concurrent.futures import ThreadPoolExecutor

D = '/home/claude/fys/data'
meta = pd.read_csv(f'{D}/stations.csv', dtype={'sid': str})


def dem_url(la, lo):
    return (f'/vsicurl/https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N{la:02d}_00_E{lo:03d}_00_DEM/'
            f'Copernicus_DSM_COG_10_N{la:02d}_00_E{lo:03d}_00_DEM.tif')


def wc_url(la, lo):
    return (f'/vsicurl/https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/'
            f'ESA_WorldCover_10m_2021_v200_N{la:02d}E{lo:03d}_Map.tif')


def qk(lat, lon, z=9):
    x = (lon + 180) / 360; s = math.sin(math.radians(lat)); y = 0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)
    tx, ty = int(x * 2 ** z), int(y * 2 ** z); q = ''
    for i in range(z, 0, -1):
        d = 0; m = 1 << (i - 1)
        if tx & m: d += 1
        if ty & m: d += 2
        q += str(d)
    return q


def read_merged(urls, bounds):
    srcs = []
    for u in sorted(set(urls)):
        try: srcs.append(rasterio.open(u))
        except Exception: pass
    if not srcs: return None, None
    arr, tr = merge(srcs, bounds=bounds)
    for s in srcs: s.close()
    return arr[0].astype(float), tr


def feats(r):
    lat, lon = r.lat, r.lon
    out = {'sid': r.sid}
    # ---------- DEM, 3 km radius ----------
    dlat = 3.0 / 110.54; dlon = 3.0 / (111.32 * math.cos(math.radians(lat)))
    b = (lon - dlon, lat - dlat, lon + dlon, lat + dlat)
    urls = [dem_url(int(math.floor(la)), int(math.floor(lo))) for la in (b[1], b[3]) for lo in (b[0], b[2])]
    z, tr = read_merged(urls, b)
    if z is not None:
        z[z < -100] = np.nan
        ny, nx = z.shape
        resx = abs(tr.a) * 111320 * math.cos(math.radians(lat)); resy = abs(tr.e) * 110540
        cy, cx = ny // 2, nx // 2
        yy, xx = np.mgrid[0:ny, 0:nx]; dist = np.hypot((yy - cy) * resy, (xx - cx) * resx)
        z0 = np.nanmean(z[max(cy - 1, 0):cy + 2, max(cx - 1, 0):cx + 2])
        out['z'] = z0
        for R in (150, 500, 1500, 3000):
            out[f'tpi{R}'] = z0 - np.nanmean(z[dist <= R])
        out['vdepth1500'] = np.nanmax(z[dist <= 1500]) - z0
        out['frac_higher20_1km'] = np.nanmean(z[dist <= 1000] > z0 + 20)
        gy = (z[min(cy + 3, ny - 1), cx] - z[max(cy - 3, 0), cx]) / (6 * resy)
        gx = (z[cy, min(cx + 3, nx - 1)] - z[cy, max(cx - 3, 0)]) / (6 * resx)
        out['slope'] = math.degrees(math.atan(math.hypot(gx, gy)))
        out['northness'] = -gy / (math.hypot(gx, gy) + 1e-6)   # +1 when terrain falls towards north (north-facing)
        # horizon angles, 16 directions out to 1.5 km -> sky view factor and southern horizon (winter sun)
        hz = []
        for k in range(16):
            a = 2 * math.pi * k / 16; best = 0.0
            for d in np.arange(45, 1500, 30):
                iy = int(round(cy - math.cos(a) * d / resy)); ix = int(round(cx + math.sin(a) * d / resx))
                if 0 <= iy < ny and 0 <= ix < nx and np.isfinite(z[iy, ix]):
                    best = max(best, math.atan2(z[iy, ix] - z0, d))
            hz.append(best)
        hz = np.array(hz)
        out['svf'] = float(np.mean(np.cos(hz) ** 2))
        out['horizon_south'] = math.degrees(np.max(hz[[6, 7, 8, 9, 10]]))
        out['horizon_mean'] = math.degrees(np.mean(hz))
    # ---------- WorldCover, 2 km ----------
    dlat = 2.0 / 110.54; dlon = 2.0 / (111.32 * math.cos(math.radians(lat)))
    b = (lon - dlon, lat - dlat, lon + dlon, lat + dlat)
    urls = [wc_url(3 * int(math.floor(la / 3)), 3 * int(math.floor(lo / 3))) for la in (b[1], b[3]) for lo in (b[0], b[2])]
    wc, tr = read_merged(urls, b)
    if wc is not None:
        ny, nx = wc.shape
        resx = abs(tr.a) * 111320 * math.cos(math.radians(lat)); resy = abs(tr.e) * 110540
        cy, cx = ny // 2, nx // 2
        yy, xx = np.mgrid[0:ny, 0:nx]; dist = np.hypot((yy - cy) * resy, (xx - cx) * resx)
        for R in (30, 100, 300, 1000):
            m = dist <= R
            out[f'tree{R}'] = np.mean(wc[m] == 10)
            out[f'built{R}'] = np.mean(wc[m] == 50)
            out[f'open{R}'] = np.mean(np.isin(wc[m], [30, 40, 60, 100]))
        for R in (300, 1000, 2000):
            out[f'water{R}'] = np.mean(wc[dist <= R] == 80)
        out['wetland1000'] = np.mean(wc[dist <= 1000] == 90)
    # ---------- canopy height 1 m, 50 m ----------
    try:
        u = f'/vsicurl/https://dataforgood-fb-data.s3.amazonaws.com/forests/v1/alsgedi_global_v6_float/chm/{qk(lat, lon)}.tif'
        with rasterio.open(u) as s:
            xs, ys = wtransform('EPSG:4326', s.crs, [lon], [lat]); x, y = xs[0], ys[0]
            f = 1 / math.cos(math.radians(lat))   # web mercator scale
            a = s.read(1, window=from_bounds(x - 50 * f, y - 50 * f, x + 50 * f, y + 50 * f, s.transform)).astype(float)
            ny, nx = a.shape; yy, xx = np.mgrid[0:ny, 0:nx]
            dist = np.hypot(yy - ny / 2, xx - nx / 2) * abs(s.transform.a) / f
            for R in (15, 30, 50):
                v = a[dist <= R]; out[f'chm{R}'] = float(np.mean(v)); out[f'chm{R}_p90'] = float(np.percentile(v, 90))
    except Exception as e:
        out['chm_err'] = str(e)[:60]
    return out


if __name__ == '__main__':
    rows = []
    with ThreadPoolExecutor(8) as ex:
        for i, o in enumerate(ex.map(feats, list(meta.itertuples()))):
            rows.append(o)
            if i % 50 == 0: print(i, flush=True)
    df = pd.DataFrame(rows)
    # bridges
    br = json.load(open('/home/claude/halkvakt/data/bridges.geojson'))
    pts = []
    for f in br['features']:
        g = f['geometry']; c = g['coordinates']
        if g['type'] == 'Point': pts.append(c)
        elif g['type'] == 'LineString': pts.extend(c)
        elif g['type'] == 'MultiLineString': [pts.extend(l) for l in c]
    P = np.array(pts)
    m2 = meta.set_index('sid')
    dmin = []
    for s in df.sid:
        lo, la = m2.loc[s, 'lon'], m2.loc[s, 'lat']
        d = np.hypot((P[:, 0] - lo) * 111.32 * math.cos(math.radians(la)), (P[:, 1] - la) * 110.54)
        dmin.append(d.min() * 1000)
    df['bridge_m'] = dmin
    df.to_csv(f'{D}/geofeat.csv', index=False)
    print(df.describe().T.to_string())
