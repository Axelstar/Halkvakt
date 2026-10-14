"""The winter maintenance class at the road points, from Lastkajen's Sverigepaket Drift och underhåll (DECISIONS #553, kort #303).

The frozen candidate's correction reads uh_klass: Axel's road_all.csv took Vagunderhallsklass from the layer VIS_DK_O_95 in a Lastkajen
GeoPackage, the nearest road with a class within 150 m of each station (fysik/roadjoin.py, frozen). The estimate from the road data
layer was not enough (71.5 % exact, #553). Bengt downloaded the package (13/10); its layer SverigePaket_DoU has the field Vagkl_564,
"Vägunderhållsklass/Vägklass", 1-5, set on the state roads (SWEREF99 TM). roadjoin.py reads its points from the package's station
layer, which this package does not have, so the join is rewritten here with roadjoin.py's rule: the nearest segment that carries a
class, within 150 m (geopandas.sjoin_nearest, max_distance 150, ties to the smallest distance).

THE RULE, written and pushed before the run:
  - first the stations (stations.csv in Axel's indata release) against road_all.csv's Vagunderhallsklass_Vagunderhallsklass;
  - the road points get the class from this package only if at least 95 % of the stations that have a class in both get the same
    class; otherwise the reason is read first (the package is from 3/10 2026, Axel's download from before 9/10, and classes change).
The package stays outside the repo. What may go into the repo depends on the package's licence, which Bengt reads in Lastkajen.
  python fysik/vagpunkter/vinterklass.py stationer --gpkg <gpkg> --stationer <stations.csv> --road-all <road_all.csv> --ut <csv>
  python fysik/vagpunkter/vinterklass.py vagpunkter --gpkg <gpkg> --ut <csv>
  python fysik/vagpunkter/vinterklass.py --sjalvtest        needs geopandas (fysik/requirements.txt), not run in ci
"""
import argparse, json, os, sys, tempfile
import numpy as np
import pandas as pd

ROT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
LAGER, FALT, MAX_M, KRAV = 'SverigePaket_DoU', 'Vagkl_564', 150.0, 0.95


def vagar(gpkg, falt=FALT):
    import geopandas as gpd
    return gpd.read_file(gpkg, layer=LAGER, columns=[falt], where=f'{falt} IS NOT NULL', engine='pyogrio')


def koppla(punkter, v, falt=FALT, namn='uh_klass'):
    """punkter: DataFrame sid, lon, lat (WGS84). Returns sid, <namn>, d_m (NaN beyond 150 m)."""
    import geopandas as gpd
    p = gpd.GeoDataFrame(punkter[['sid']].copy(), geometry=gpd.points_from_xy(punkter.lon, punkter.lat), crs='EPSG:4326').to_crs(v.crs)
    j = gpd.sjoin_nearest(p, v[[falt, 'geometry']], how='left', max_distance=MAX_M, distance_col='d_m')
    j = j.sort_values('d_m').drop_duplicates('sid')
    return punkter[['sid']].merge(j[['sid', falt, 'd_m']].rename(columns={falt: namn}), on='sid', how='left')


def reproducera(ut, road_all):
    ra = pd.read_csv(road_all, dtype={'sid': str})[['sid', 'Vagunderhallsklass_Vagunderhallsklass']].dropna()
    d = ut.dropna(subset=['uh_klass']).merge(ra, on='sid')
    lika = float(np.mean(d.uh_klass.astype(int) == d.Vagunderhallsklass_Vagunderhallsklass.astype(int))) if len(d) else float('nan')
    tab = pd.crosstab(d.Vagunderhallsklass_Vagunderhallsklass.astype(int).rename('Axel'), d.uh_klass.astype(int).rename('paketet'))
    return len(d), lika, tab, int(ra.sid.isin(ut.dropna(subset=['uh_klass']).sid).sum()), len(ra)


def sjalvtest():
    import geopandas as gpd
    from shapely.geometry import LineString
    fel = []
    with tempfile.TemporaryDirectory() as d:
        x0, y0 = 600000, 6600000                                                   # SWEREF99 TM, around 59.5 N 16.8 E
        v = gpd.GeoDataFrame({FALT: [2, 4, None]}, geometry=[LineString([(x0 - 500, y0), (x0 + 500, y0)]),
                                                             LineString([(x0 - 500, y0 + 400), (x0 + 500, y0 + 400)]),
                                                             LineString([(x0 - 500, y0 + 50), (x0 + 500, y0 + 50)])], crs='EPSG:3006')
        v.to_file(f'{d}/p.gpkg', layer=LAGER, engine='pyogrio')
        pts = gpd.GeoDataFrame({'sid': ['a', 'b', 'c']}, geometry=gpd.points_from_xy([x0, x0, x0], [y0 + 60, y0 + 330, y0 + 2000]), crs='EPSG:3006').to_crs('EPSG:4326')
        punkter = pd.DataFrame({'sid': pts.sid, 'lon': pts.geometry.x, 'lat': pts.geometry.y})
        ut = koppla(punkter, vagar(f'{d}/p.gpkg')).set_index('sid')
        if not (ut.loc['a', 'uh_klass'] == 2 and abs(ut.loc['a', 'd_m'] - 60) < 0.5): fel.append(f'a: närmaste vägen med klass, inte den utan (60 m): {ut.loc["a"].tolist()}')
        if not (ut.loc['b', 'uh_klass'] == 4 and abs(ut.loc['b', 'd_m'] - 70) < 0.5): fel.append(f'b: {ut.loc["b"].tolist()}')
        if not pd.isna(ut.loc['c', 'uh_klass']): fel.append('c: bortom 150 m får ingen klass')
        pd.DataFrame({'sid': ['a', 'b', 'x'], 'Vagunderhallsklass_Vagunderhallsklass': [2.0, 3.0, 1.0]}).to_csv(f'{d}/ra.csv', index=False)
        n, lika, _, _, _ = reproducera(ut.reset_index(), f'{d}/ra.csv')
        if not (n == 2 and lika == 0.5): fel.append(f'reproduktionen: {n} stationer, {lika} lika')
    for f in fel: print('✗', f)
    if fel: sys.exit(1)
    print('✓ självtest: närmaste vägen med klass inom 150 m (vägar utan klass hoppas över), ingen klass bortom 150 m, och reproduktionen räknar lika')


if __name__ == '__main__':
    if '--sjalvtest' in sys.argv:
        sjalvtest(); sys.exit(0)
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest='cmd', required=True)
    a1 = sp.add_parser('stationer'); a1.add_argument('--gpkg', required=True); a1.add_argument('--stationer', required=True)
    a1.add_argument('--road-all', required=True); a1.add_argument('--ut', required=True)
    a2 = sp.add_parser('vagpunkter'); a2.add_argument('--gpkg', required=True); a2.add_argument('--ut', required=True)
    a = ap.parse_args()
    v = vagar(a.gpkg)
    print(f'{LAGER}: {len(v)} segment med vägunderhållsklass, {v.crs}')
    if a.cmd == 'stationer':
        st = pd.read_csv(a.stationer, dtype={'sid': str})[['sid', 'lon', 'lat']]
        ut = koppla(st, v); ut.to_csv(a.ut, index=False)
        n, lika, tab, _, n_ra = reproducera(ut, a.road_all)
        print(f'REPRODUKTIONEN (DECISIONS #553): {len(st)} stationer, {int(ut.uh_klass.notna().sum())} med klass inom {MAX_M:g} m; '
              f'{n} med klass både här och i road_all.csv (av {n_ra})')
        print(f'  samma klass {100 * lika:.1f} % (kravet {100 * KRAV:.0f} %)')
        print('  rader Axels klass, kolumner paketets:'); print('  ' + tab.to_string().replace('\n', '\n  '))
        print('REPRODUCERAR: vägpunkterna kan få klassen ur paketet' if lika >= KRAV else 'REPRODUCERAR INTE: skälet läses innan vägpunkterna')
        sys.exit(0 if lika >= KRAV else 1)
    sys.path.insert(0, os.path.join(ROT, 'fysik/vagpunkter'))
    import vagpunkter
    p = vagpunkter.punkter_tabell(vagpunkter.PUNKTER)
    ut = koppla(p[['sid', 'lon', 'lat']], v).merge(p[['sid', 'id']], on='sid')[['sid', 'id', 'uh_klass', 'd_m']]
    ut.to_csv(a.ut, index=False)
    print(f'{a.ut}: {len(ut)} punkter, {int(ut.uh_klass.notna().sum())} med klass inom {MAX_M:g} m; klasserna {ut.uh_klass.value_counts().sort_index().to_dict()}')
