"""ÅDT and the functional road class at the road points, from Lastkajen's Sverigepaket Drift och underhåll (DECISIONS #553, kort #303).

Bengt 14/10 ("2 ja", BED §4.2): the stations' road data in the correction come from Axel's roadjoin.py against an NVDB GeoPackage
(road_all.csv: Trafik_Adt_samtliga_fordon, FunkVagklass_Klass), while the road points had theirs from the road data layer (the open
API), whose ÅDT correlates 0.861 with Axel's at the stations. The package Bengt downloaded (13/10) carries ADT_f_117 (ÅDT, all
vehicles) and Klass_181 (functional road class 0-9), but no heavy vehicles.

The first rule (65238f1) joined each field to its own nearest segment: ÅDT passed (95.7 % within ±10 % of Axel, the layer 90.8 %), the
class did not (92.2 %; the nearest segment was often a small road without traffic counts beside the station). The package's ROUTE_ID
is the layer's element_id, and on the same element the two carry the same ÅDT (98.6 % exact): they differ in the choice of road only.
Bengt 14/10 ("a och ja till båda"): the class from the same segment as ÅDT, the gaps from the layer, and the junction points (km 0)
keep the package's ÅDT like every other point.

THE RULE, written and pushed before the run:
  - ÅDT and class from ONE segment: the nearest that carries ÅDT, within 150 m;
  - where the package leaves a field empty (no such segment, or a segment without class), the road data layer's value, and the
    column <field>_kalla says which source the value came from;
  - first the stations (stations.csv in Axel's indata release) against road_all.csv: the class (with the layer's where the package
    has none) = FunkVagklass_Klass at >= 95 % of the stations with a class in both; ÅDT from the package alone within ±10 % of
    Trafik_Adt_samtliga_fordon at >= 90 % of the stations with ÅDT in both, and at least as often as the layer on the stations with
    ÅDT in all three (data/vagdata/stationer.json);
  - the road points get the fields only if both pass; otherwise the reason is read first.
  python fysik/vagpunkter/trafik_klass.py stationer --gpkg <gpkg> --stationer <stations.csv> --road-all <road_all.csv> --ut <csv>
  python fysik/vagpunkter/trafik_klass.py vagpunkter --gpkg <gpkg> --ut <csv>
  python fysik/vagpunkter/trafik_klass.py --sjalvtest        needs geopandas (fysik/requirements.txt), not run in ci
"""
import argparse, json, os, sys, tempfile
import numpy as np
import pandas as pd

ROT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
sys.path.insert(0, os.path.join(ROT, 'fysik/vagpunkter'))
import vinterklass

FALT = {'adt_fordon': 'ADT_f_117', 'klass': 'Klass_181'}
AXEL = {'adt_fordon': 'Trafik_Adt_samtliga_fordon', 'klass': 'FunkVagklass_Klass'}
KRAV = {'adt_fordon': 0.90, 'klass': 0.95}
TOL = 0.10                                                     # ÅDT agrees when within ±10 % of Axel's
STATIONER = os.path.join(ROT, 'data/vagdata/stationer.json')


def vagar(gpkg):
    """The package's segments that carry ÅDT, with their class."""
    import geopandas as gpd
    return gpd.read_file(gpkg, layer=vinterklass.LAGER, columns=list(FALT.values()), where=f"{FALT['adt_fordon']} IS NOT NULL", engine='pyogrio')


def koppla(punkter, v):
    """punkter: DataFrame sid, lon, lat (WGS84). Returns sid, adt_fordon, klass, d_m: both from the nearest segment in v within 150 m."""
    import geopandas as gpd
    p = gpd.GeoDataFrame(punkter[['sid']].copy(), geometry=gpd.points_from_xy(punkter.lon, punkter.lat), crs='EPSG:4326').to_crs(v.crs)
    j = gpd.sjoin_nearest(p, v[[*FALT.values(), 'geometry']], how='left', max_distance=vinterklass.MAX_M, distance_col='d_m')
    j = j.sort_values('d_m').drop_duplicates('sid').rename(columns={f: n for n, f in FALT.items()})
    return punkter[['sid']].merge(j[['sid', *FALT, 'd_m']], on='sid', how='left')


def lagret(fil, nyckel):
    """The road data layer's adt_fordon and klass per place: stationer.json by station id, vaglagspunkter.json by row number (sid)."""
    r = json.load(open(fil, encoding='utf-8'))['rader']
    d = pd.DataFrame({'sid': [str(x['id']) if nyckel == 'id' else f'{i:05d}' for i, x in enumerate(r)],
                      'adt_fordon': [x.get('adt_fordon') for x in r], 'klass': [x.get('klass') for x in r]})
    return d.astype({'adt_fordon': float, 'klass': float})


def fyll(ut, lag, falt=tuple(FALT)):
    """Adds the layer's values as <field>_lagret and fills the fields in falt where the package left them empty; <field>_kalla names
    the source of each value (paketet, vagdatalagret, or empty)."""
    ut = ut.merge(lag.rename(columns={n: f'{n}_lagret' for n in FALT}), on='sid', how='left')
    for n in falt:
        ut[f'{n}_kalla'] = np.where(ut[n].notna(), 'paketet', np.where(ut[f'{n}_lagret'].notna(), 'vagdatalagret', ''))
        ut[n] = ut[n].fillna(ut[f'{n}_lagret'])
    return ut


def stationer(st, v, lag):
    """The stations: the class filled from the layer, ÅDT the package's alone (its rule compares the package with the layer)."""
    return fyll(koppla(st, v), lag, ('klass',))


def lika(a, b, namn):
    return np.abs(a / b - 1) <= TOL if namn == 'adt_fordon' else a.astype(int) == b.astype(int)


def reproducera(ut, road_all):
    """ut: the stations after fyll(..., ('klass',)): the class filled, ÅDT the package's alone. Per field (stations in both, share
    equal, passes); for ÅDT also the layer's share on the stations with ÅDT in all three."""
    ra = pd.read_csv(road_all, dtype={'sid': str})
    dom = {}
    for namn in FALT:
        d = ut[['sid', namn]].dropna().merge(ra[['sid', AXEL[namn]]].dropna(), on='sid')
        andel = float(np.mean(lika(d[namn], d[AXEL[namn]], namn))) if len(d) else float('nan')
        dom[namn] = {'n': len(d), 'andel': andel, 'klarar': bool(andel >= KRAV[namn])}
    d = ut[['sid', 'adt_fordon', 'adt_fordon_lagret']].dropna().merge(ra[['sid', AXEL['adt_fordon']]].dropna(), on='sid')
    a_paket = float(np.mean(lika(d.adt_fordon, d[AXEL['adt_fordon']], 'adt_fordon')))
    a_lagret = float(np.mean(lika(d.adt_fordon_lagret, d[AXEL['adt_fordon']], 'adt_fordon')))
    log = lambda x: np.log10(x.clip(lower=10))
    r = lambda x: float(np.corrcoef(log(x), log(d[AXEL['adt_fordon']]))[0, 1]) if len(d) > 2 else float('nan')
    dom['adt_fordon'].update(n3=len(d), paketet=a_paket, lagret=a_lagret, r_paketet=r(d.adt_fordon), r_lagret=r(d.adt_fordon_lagret))
    dom['adt_fordon']['klarar'] = dom['adt_fordon']['klarar'] and a_paket >= a_lagret
    return dom


def sjalvtest():
    import geopandas as gpd
    from shapely.geometry import LineString
    fel = []
    x0, y0 = 600000, 6600000                                                   # SWEREF99 TM, around 59.5 N 16.8 E
    L = lambda dy: LineString([(x0 - 500, y0 + dy), (x0 + 500, y0 + dy)])
    with tempfile.TemporaryDirectory() as d:
        # The road 50 m north has a class but no ÅDT (a small road): it must not be chosen. The road 800 m north has ÅDT but no class.
        gpd.GeoDataFrame({'ADT_f_117': [1000.0, 5000.0, None, 2000.0], 'Klass_181': [3.0, 1.0, 9.0, None]},
                         geometry=[L(0), L(400), L(50), L(800)], crs='EPSG:3006').to_file(f'{d}/p.gpkg', layer=vinterklass.LAGER, engine='pyogrio')
        pts = gpd.GeoDataFrame({'sid': ['a', 'b', 'c', 'e']}, geometry=gpd.points_from_xy([x0] * 4, [y0 + 60, y0 + 330, y0 + 2000, y0 + 820]),
                               crs='EPSG:3006').to_crs('EPSG:4326')
        punkter = pd.DataFrame({'sid': pts.sid, 'lon': pts.geometry.x, 'lat': pts.geometry.y})
        lag = pd.DataFrame({'sid': ['a', 'b', 'c', 'e'], 'adt_fordon': [1100.0, 5100.0, 777.0, 2100.0], 'klass': [3.0, 1.0, 4.0, 2.0]})
        ut = fyll(koppla(punkter, vagar(f'{d}/p.gpkg')), lag).set_index('sid')
        if not (ut.loc['a', 'adt_fordon'] == 1000 and ut.loc['a', 'klass'] == 3 and abs(ut.loc['a', 'd_m'] - 60) < 0.5
                and ut.loc['a', 'adt_fordon_kalla'] == ut.loc['a', 'klass_kalla'] == 'paketet'):
            fel.append(f'a: ÅDT och klass ur samma väg med ÅDT (60 m), inte småvägen utan ÅDT (10 m): {ut.loc["a"].tolist()}')
        if not (ut.loc['b', 'adt_fordon'] == 5000 and ut.loc['b', 'klass'] == 1): fel.append(f'b: {ut.loc["b"].tolist()}')
        if not (ut.loc['c', 'adt_fordon'] == 777 and ut.loc['c', 'klass'] == 4 and ut.loc['c', 'adt_fordon_kalla'] == ut.loc['c', 'klass_kalla'] == 'vagdatalagret'):
            fel.append(f'c: bortom 150 m fylls båda ur vägdatalagret: {ut.loc["c"].tolist()}')
        if not (ut.loc['e', 'adt_fordon'] == 2000 and ut.loc['e', 'adt_fordon_kalla'] == 'paketet' and ut.loc['e', 'klass'] == 2
                and ut.loc['e', 'klass_kalla'] == 'vagdatalagret'):
            fel.append(f'e: ett segment utan klass ger klassen ur vägdatalagret, ÅDT ur paketet: {ut.loc["e"].tolist()}')
        st = stationer(punkter, vagar(f'{d}/p.gpkg'), lag).set_index('sid')
        if not (pd.isna(st.loc['c', 'adt_fordon']) and st.loc['c', 'klass'] == 4): fel.append('stationerna: bara klassen fylls, ÅDT är paketets ensamt')
        # a: 1000 mot 1090 är inom 10 %; b: 5000 mot 5600 är 10,7 % ifrån. Klassen: a lika, b inte.
        pd.DataFrame({'sid': ['a', 'b', 'x'], AXEL['adt_fordon']: [1090.0, 5600.0, 10.0], AXEL['klass']: [3, 2, 0]}).to_csv(f'{d}/ra.csv', index=False)
        dom = reproducera(st.loc[['a', 'b']].reset_index(), f'{d}/ra.csv')
        if not (dom['adt_fordon']['n'] == 2 and dom['adt_fordon']['andel'] == 0.5 and dom['klass']['andel'] == 0.5 and not dom['klass']['klarar']
                and not dom['adt_fordon']['klarar']):
            fel.append(f'reproduktionen: {dom}')
        # Ten stations: the package hits 9 (90 %, the floor). It passes when the layer also hits 9, not when the layer hits 10.
        s = [f's{i}' for i in range(10)]
        axel = [1000.0 * (i + 1) for i in range(10)]
        pd.DataFrame({'sid': s, AXEL['adt_fordon']: axel, AXEL['klass']: [3] * 10}).to_csv(f'{d}/ra10.csv', index=False)
        for traffar, ska in ((9, True), (10, False)):
            ut10 = pd.DataFrame({'sid': s, 'adt_fordon': axel[:9] + [2 * axel[9]], 'klass': [3] * 9 + [4],
                                 'adt_fordon_lagret': axel[:traffar] + [2 * x for x in axel[traffar:]]})
            dom10 = reproducera(ut10, f'{d}/ra10.csv'); r = dom10['adt_fordon']
            if r['klarar'] != ska: fel.append(f'paketet 90 %, lagret {10 * traffar} %: klarar ska vara {ska}: {r}')
        if dom10['klass']['andel'] != 0.9 or dom10['klass']['klarar']: fel.append(f'klassen 90 % klarar inte kravet 95 %: {dom10["klass"]}')
    for f in fel: print('✗', f)
    if fel: sys.exit(1)
    print('✓ självtest: ÅDT och klass ur samma närmaste väg med ÅDT inom 150 m (småvägen utan ÅDT hoppas över), luckorna ur '
          'vägdatalagret med källan utskriven, vid stationerna bara klassen; ±10 % räknas rätt, och ÅDT klarar bara med 90 % och minst lagrets andel')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    if '--sjalvtest' in sys.argv:
        sjalvtest(); sys.exit(0)
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest='cmd', required=True)
    a1 = sp.add_parser('stationer'); a1.add_argument('--gpkg', required=True); a1.add_argument('--stationer', required=True)
    a1.add_argument('--road-all', required=True); a1.add_argument('--ut', required=True)
    a2 = sp.add_parser('vagpunkter'); a2.add_argument('--gpkg', required=True); a2.add_argument('--ut', required=True)
    a = ap.parse_args()
    v = vagar(a.gpkg)
    print(f'{vinterklass.LAGER}: {len(v)} segment med ÅDT, {int(v[FALT["klass"]].isna().sum())} av dem utan klass, {v.crs}')
    if a.cmd == 'stationer':
        st = pd.read_csv(a.stationer, dtype={'sid': str})[['sid', 'lon', 'lat']]
        ut = stationer(st, v, lagret(STATIONER, 'id')); ut.to_csv(a.ut, index=False)
        dom = reproducera(ut, a.road_all)
        print(f'REPRODUKTIONEN (DECISIONS #553): {len(st)} stationer; klassen ur vägdatalagret vid {int((ut.klass_kalla == "vagdatalagret").sum())}')
        for namn, r in dom.items():
            print(f'  {namn}: {r["n"]} stationer i båda, {100 * r["andel"]:.1f} % lika (kravet {100 * KRAV[namn]:.0f} %)')
        r = dom['adt_fordon']
        print(f'  ÅDT på de {r["n3"]} stationerna med ÅDT i alla tre: paketet {100 * r["paketet"]:.1f} %, vägdatalagret {100 * r["lagret"]:.1f} % '
              f'inom ±{100 * TOL:.0f} % av Axel; korrelation i log10 {r["r_paketet"]:.3f} mot {r["r_lagret"]:.3f}')
        for namn, r in dom.items():
            print(f'{namn}: ' + ('REPRODUCERAR' if r['klarar'] else 'REPRODUCERAR INTE: skälet läses först'))
        sys.exit(0 if all(r['klarar'] for r in dom.values()) else 1)
    import vagpunkter
    p = vagpunkter.punkter_tabell(vagpunkter.PUNKTER)
    ut = fyll(koppla(p[['sid', 'lon', 'lat']], v), lagret(vagpunkter.PUNKTER, 'rad')).merge(p[['sid', 'id']], on='sid')
    ut = ut[['sid', 'id', 'adt_fordon', 'adt_fordon_kalla', 'klass', 'klass_kalla', 'd_m']]
    ut.to_csv(a.ut, index=False)
    print(f'{a.ut}: {len(ut)} punkter')
    for n in FALT:
        print(f'  {n}: ' + ', '.join(f'{k or "saknas"} {c}' for k, c in ut[f'{n}_kalla'].value_counts().items()))
    print(f'  klasserna {ut.klass.value_counts().sort_index().to_dict()}')
