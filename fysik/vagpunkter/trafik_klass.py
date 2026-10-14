"""ÅDT and the functional road class at the road points, from Lastkajen's Sverigepaket Drift och underhåll (DECISIONS #553, kort #303).

Bengt 14/10 ("2 ja", BED §4.2): the stations' road data in the correction come from Axel's roadjoin.py against an NVDB GeoPackage
(road_all.csv: Trafik_Adt_samtliga_fordon, FunkVagklass_Klass), while the road points had theirs from the road data layer (the open
API), whose ÅDT correlates 0.861 with Axel's at the stations. The package Bengt downloaded (13/10) carries ADT_f_117 (ÅDT, all
vehicles) and Klass_181 (functional road class 0-9), but no heavy vehicles. Each field is joined the way roadjoin.py joins each layer:
the nearest segment that carries the field, within 150 m (vinterklass.koppla).

THE RULE, written and pushed before the run:
  - first the stations (stations.csv in Axel's indata release) against road_all.csv;
  - class: Klass_181 = FunkVagklass_Klass at >= 95 % of the stations that have a class in both (as the winter class);
  - ÅDT: ADT_f_117 within ±10 % of Trafik_Adt_samtliga_fordon at >= 90 % of the stations that have ÅDT in both, AND at least as
    often as the road data layer (data/vagdata/stationer.json, adt_fordon) on the stations that have ÅDT in all three;
  - the road points get a field from the package only if that field passes; otherwise the reason is read first.
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
LAGRET = os.path.join(ROT, 'data/vagdata/stationer.json')


def koppla(punkter, gpkg=None, vagar=None):
    """punkter: DataFrame sid, lon, lat. Returns sid, adt_fordon, d_adt_m, klass, d_klass_m; each field from its own nearest segment."""
    ut = punkter[['sid']].copy()
    for namn, falt in FALT.items():
        v = vagar[namn] if vagar is not None else vinterklass.vagar(gpkg, falt)
        j = vinterklass.koppla(punkter, v, falt, namn).rename(columns={'d_m': f'd_{namn.split("_")[0]}_m'})
        ut = ut.merge(j, on='sid', how='left')
    return ut


def lika(a, b, namn):
    return np.abs(a / b - 1) <= TOL if namn == 'adt_fordon' else a.astype(int) == b.astype(int)


def reproducera(ut, road_all, lagret=None):
    """Per field: (stations in both, share equal, passes). For ÅDT also the road data layer's share on the stations in all three."""
    ra = pd.read_csv(road_all, dtype={'sid': str})
    dom = {}
    for namn in FALT:
        d = ut[['sid', namn]].dropna().merge(ra[['sid', AXEL[namn]]].dropna(), on='sid')
        andel = float(np.mean(lika(d[namn], d[AXEL[namn]], namn))) if len(d) else float('nan')
        dom[namn] = {'n': len(d), 'andel': andel, 'klarar': bool(andel >= KRAV[namn])}
    if lagret is not None:
        d = ut[['sid', 'adt_fordon']].dropna().merge(ra[['sid', AXEL['adt_fordon']]].dropna(), on='sid') \
            .merge(lagret[['sid', 'adt_lagret']].dropna(), on='sid')
        a_paket = float(np.mean(lika(d.adt_fordon, d[AXEL['adt_fordon']], 'adt_fordon')))
        a_lagret = float(np.mean(lika(d.adt_lagret, d[AXEL['adt_fordon']], 'adt_fordon')))
        log = lambda x: np.log10(x.clip(lower=10))
        dom['adt_fordon'].update(n3=len(d), paketet=a_paket, lagret=a_lagret,
                                 r_paketet=float(np.corrcoef(log(d.adt_fordon), log(d[AXEL['adt_fordon']]))[0, 1]),
                                 r_lagret=float(np.corrcoef(log(d.adt_lagret), log(d[AXEL['adt_fordon']]))[0, 1]))
        dom['adt_fordon']['klarar'] = dom['adt_fordon']['klarar'] and a_paket >= a_lagret
    return dom


def lagret_vid_stationer(fil=LAGRET):
    return pd.DataFrame([{'sid': str(r['id']), 'adt_lagret': r.get('adt_fordon')} for r in json.load(open(fil, encoding='utf-8'))['rader']])


def sjalvtest():
    import geopandas as gpd
    from shapely.geometry import LineString
    fel = []
    x0, y0 = 600000, 6600000                                                   # SWEREF99 TM, around 59.5 N 16.8 E
    linjer = [LineString([(x0 - 500, y0), (x0 + 500, y0)]), LineString([(x0 - 500, y0 + 400), (x0 + 500, y0 + 400)]),
              LineString([(x0 - 500, y0 + 50), (x0 + 500, y0 + 50)])]
    # The segment 50 m north has a class but no ÅDT: the point 60 m north takes its class from it and its ÅDT from the road at 0 m.
    v = gpd.GeoDataFrame({'ADT_f_117': [1000.0, 5000.0, None], 'Klass_181': [3, 1, 5]}, geometry=linjer, crs='EPSG:3006')
    vagar = {n: v[v[f].notna()][[f, 'geometry']].reset_index(drop=True) for n, f in FALT.items()}
    pts = gpd.GeoDataFrame({'sid': ['a', 'b', 'c']}, geometry=gpd.points_from_xy([x0, x0, x0], [y0 + 60, y0 + 330, y0 + 2000]), crs='EPSG:3006').to_crs('EPSG:4326')
    ut = koppla(pd.DataFrame({'sid': pts.sid, 'lon': pts.geometry.x, 'lat': pts.geometry.y}), vagar=vagar).set_index('sid')
    if not (ut.loc['a', 'adt_fordon'] == 1000 and abs(ut.loc['a', 'd_adt_m'] - 60) < 0.5 and ut.loc['a', 'klass'] == 5
            and abs(ut.loc['a', 'd_klass_m'] - 10) < 0.5):
        fel.append(f'a: ÅDT och klass ur var sin närmaste väg som bär fältet: {ut.loc["a"].tolist()}')
    if not (ut.loc['b', 'adt_fordon'] == 5000 and ut.loc['b', 'klass'] == 1): fel.append(f'b: {ut.loc["b"].tolist()}')
    if not (pd.isna(ut.loc['c', 'adt_fordon']) and pd.isna(ut.loc['c', 'klass'])): fel.append('c: bortom 150 m får inget')
    with tempfile.TemporaryDirectory() as d:
        pd.DataFrame({'sid': ['a', 'b', 'x'], AXEL['adt_fordon']: [1090.0, 5600.0, 10.0], AXEL['klass']: [5, 2, 0]}).to_csv(f'{d}/ra.csv', index=False)
        lagret = pd.DataFrame({'sid': ['a', 'b'], 'adt_lagret': [1000.0, 5000.0]})
        dom = reproducera(ut.reset_index(), f'{d}/ra.csv', lagret)
        # a: 1000 mot 1090 är inom 10 %; b: 5000 mot 5600 är 10,7 % ifrån. Klassen: a lika, b inte.
        if not (dom['adt_fordon']['n'] == 2 and dom['adt_fordon']['andel'] == 0.5 and dom['klass']['andel'] == 0.5 and not dom['klass']['klarar']):
            fel.append(f'reproduktionen: {dom}')
        if not (dom['adt_fordon']['paketet'] == dom['adt_fordon']['lagret'] == 0.5 and not dom['adt_fordon']['klarar']):
            fel.append(f'ÅDT under 90 % klarar inte, också när lagret är lika bra: {dom["adt_fordon"]}')
        dom = reproducera(ut.reset_index(), f'{d}/ra.csv', pd.DataFrame({'sid': ['a', 'b'], 'adt_lagret': [1050.0, 5500.0]}))
        if dom['adt_fordon']['lagret'] != 1.0: fel.append(f'lagret räknas mot Axel: {dom["adt_fordon"]}')
        # Ten stations: the package hits 9 (90 %, the floor). It passes when the layer also hits 9, not when the layer hits 10.
        s = [f's{i}' for i in range(10)]
        axel = [1000.0 * (i + 1) for i in range(10)]
        pd.DataFrame({'sid': s, AXEL['adt_fordon']: axel, AXEL['klass']: [3] * 10}).to_csv(f'{d}/ra10.csv', index=False)
        ut10 = pd.DataFrame({'sid': s, 'adt_fordon': axel[:9] + [2 * axel[9]], 'klass': [3] * 9 + [4]})
        for traffar, ska in ((9, True), (10, False)):
            lag = pd.DataFrame({'sid': s, 'adt_lagret': axel[:traffar] + [2 * x for x in axel[traffar:]]})
            dom10 = reproducera(ut10, f'{d}/ra10.csv', lag); r = dom10['adt_fordon']
            if r['klarar'] != ska: fel.append(f'paketet 90 %, lagret {10 * traffar} %: klarar ska vara {ska}: {r}')
        if dom10['klass']['andel'] != 0.9 or dom10['klass']['klarar']: fel.append(f'klassen 90 % klarar inte kravet 95 %: {dom10["klass"]}')
    for f in fel: print('✗', f)
    if fel: sys.exit(1)
    print('✓ självtest: ÅDT och klass ur var sin närmaste väg som bär fältet inom 150 m, inget bortom 150 m; ±10 % räknas rätt, '
          'och ÅDT klarar bara med 90 % och minst lagrets andel')


if __name__ == '__main__':
    if '--sjalvtest' in sys.argv:
        sjalvtest(); sys.exit(0)
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest='cmd', required=True)
    a1 = sp.add_parser('stationer'); a1.add_argument('--gpkg', required=True); a1.add_argument('--stationer', required=True)
    a1.add_argument('--road-all', required=True); a1.add_argument('--ut', required=True)
    a2 = sp.add_parser('vagpunkter'); a2.add_argument('--gpkg', required=True); a2.add_argument('--ut', required=True)
    a = ap.parse_args()
    if a.cmd == 'stationer':
        st = pd.read_csv(a.stationer, dtype={'sid': str})[['sid', 'lon', 'lat']]
        ut = koppla(st, a.gpkg); ut.to_csv(a.ut, index=False)
        dom = reproducera(ut, a.road_all, lagret_vid_stationer())
        print(f'REPRODUKTIONEN (DECISIONS #553): {len(st)} stationer')
        for namn, r in dom.items():
            print(f'  {namn}: {r["n"]} stationer i båda, {100 * r["andel"]:.1f} % lika (kravet {100 * KRAV[namn]:.0f} %)')
        r = dom['adt_fordon']
        print(f'  ÅDT på de {r["n3"]} stationerna med ÅDT i alla tre: paketet {100 * r["paketet"]:.1f} %, vägdatalagret {100 * r["lagret"]:.1f} % '
              f'inom ±{100 * TOL:.0f} % av Axel; korrelation i log10 {r["r_paketet"]:.3f} mot {r["r_lagret"]:.3f}')
        for namn, r in dom.items():
            print(f'{namn}: ' + ('REPRODUCERAR: vägpunkterna kan få fältet ur paketet' if r['klarar'] else 'REPRODUCERAR INTE: skälet läses först'))
        sys.exit(0 if all(r['klarar'] for r in dom.values()) else 1)
    import vagpunkter
    p = vagpunkter.punkter_tabell(vagpunkter.PUNKTER)
    ut = koppla(p[['sid', 'lon', 'lat']], a.gpkg).merge(p[['sid', 'id']], on='sid')
    ut = ut[['sid', 'id', 'adt_fordon', 'd_adt_m', 'klass', 'd_klass_m']]
    ut.to_csv(a.ut, index=False)
    print(f'{a.ut}: {len(ut)} punkter; ÅDT vid {int(ut.adt_fordon.notna().sum())}, klass vid {int(ut.klass.notna().sum())} inom 150 m; '
          f'klasserna {ut.klass.value_counts().sort_index().to_dict()}')
