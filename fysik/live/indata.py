"""The chain's fixed indata for EVERY point — the stations from Axel's frozen indata release, the road points from data/vagdata/ —
in the forms common.load() and kedja.base_features_mn read (kort #343 steg 3, DECISIONS #558).

  python fysik/live/indata.py --frusen <the release's data/ dir> --rot <repo> --ut <dir>

Out in --ut: stations.csv (sid, lon, lat), elev.csv (sid, elev, tpi1, tpi3), elev_ifs.csv (sid, elev_ifs), geofeat.csv, geofeat2.csv,
road_all.csv (the five columns the features read). Stations: sid as in the release, elev_ifs from ifs/<sid>.csv (ECMWF's height, the
feature the frozen model saw, DECISIONS #553 choice i applies only to the road points), only stations with an ifs file (as common.load).
Road points: sid "v" + the row number, elev_ifs = elev (DECISIONS #553 choice i), ÅDT and the functional class from
vaglagspunkter-adt-klass.json (DECISIONS #553: Lastkajen, the gaps from the road data layer), heavy vehicles from vaglagspunkter.json
(adt_lastbilar), the winter class from vaglagspunkter-vinterklass.json, Europaväg 'Ja'/'Nej' from vaglagspunkter-europavag.json.
A missing value stays empty: the features carry NaN and the model handles it, as at the stations.
  python fysik/live/indata.py --sjalvtest          synthetic data only; runs in ci.yml
"""
import argparse, json, os, sys, tempfile
import pandas as pd

GEO1 = ['svf', 'horizon_south', 'tree100', 'chm30', 'water1000', 'built300']
GEO2 = ['tpi2km', 'tpi5km', 'tpi10km', 'tpi20km', 'vdepth5km', 'vdepth10km']
ROAD = ['Trafik_Adt_samtliga_fordon', 'Trafik_Adt_tunga_fordon', 'Vagunderhallsklass_Vagunderhallsklass', 'FunkVagklass_Klass', 'Vagnummer_Europavag']


def stationer(frusen):
    st = pd.read_csv(f'{frusen}/stations.csv', dtype={'sid': str})
    st = st[[os.path.exists(f'{frusen}/ifs/{s}.csv') for s in st.sid]].reset_index(drop=True)
    las = lambda f: pd.read_csv(f'{frusen}/{f}', dtype={'sid': str}).drop_duplicates('sid').set_index('sid').reindex(st.sid)
    el, g1, g2, rd = las('elev.csv'), las('geofeat.csv'), las('geofeat2.csv'), las('road_all.csv')
    ifs = [float(pd.read_csv(f'{frusen}/ifs/{s}.csv', nrows=1).elev_ifs.iloc[0]) for s in st.sid]
    return (st[['sid', 'lon', 'lat']],
            pd.DataFrame({'sid': st.sid, 'elev': el.elev.values, 'tpi1': el.tpi1.values, 'tpi3': el.tpi3.values}),
            pd.DataFrame({'sid': st.sid, 'elev_ifs': ifs}),
            pd.DataFrame({'sid': st.sid, **{c: g1[c].values for c in GEO1}}),
            pd.DataFrame({'sid': st.sid, **{c: g2[c].values for c in GEO2}}),
            pd.DataFrame({'sid': st.sid, **{c: rd[c].values for c in ROAD}}))


def vagpunkter(rot):
    j = lambda f: json.load(open(f'{rot}/data/vagdata/{f}', encoding='utf-8'))['rader']
    p, sd, vk, ev, ak = j('vaglagspunkter.json'), j('vaglagspunkter-sardrag.json'), j('vaglagspunkter-vinterklass.json'), j('vaglagspunkter-europavag.json'), j('vaglagspunkter-adt-klass.json')
    n = len(p)
    if not (len(sd) == len(vk) == len(ev) == len(ak) == n):
        raise ValueError(f'väglagspunkternas filer har olika längd: {n}, {len(sd)}, {len(vk)}, {len(ev)}, {len(ak)}')
    for i in range(n):
        if not (sd[i]['sid'] == vk[i]['sid'] == ev[i]['sid'] == ak[i]['sid'] == f'{i:05d}'):
            raise ValueError(f'rad {i}: sid stämmer inte mellan filerna')
    sid = [f'v{i:05d}' for i in range(n)]
    g = lambda r, k: r.get(k) if r.get(k) is not None else float('nan')
    return (pd.DataFrame({'sid': sid, 'lon': [r['lon'] for r in p], 'lat': [r['lat'] for r in p]}),
            pd.DataFrame({'sid': sid, 'elev': [g(r, 'elev') for r in sd], 'tpi1': [g(r, 'tpi1') for r in sd], 'tpi3': [g(r, 'tpi3') for r in sd]}),
            pd.DataFrame({'sid': sid, 'elev_ifs': [g(r, 'elev') for r in sd]}),
            pd.DataFrame({'sid': sid, **{c: [g(r, c) for r in sd] for c in GEO1}}),
            pd.DataFrame({'sid': sid, **{c: [g(r, c) for r in sd] for c in GEO2}}),
            pd.DataFrame({'sid': sid, 'Trafik_Adt_samtliga_fordon': [g(r, 'adt_fordon') for r in ak], 'Trafik_Adt_tunga_fordon': [g(r, 'adt_lastbilar') for r in p],
                          'Vagunderhallsklass_Vagunderhallsklass': [g(r, 'uh_klass') for r in vk], 'FunkVagklass_Klass': [g(r, 'klass') for r in ak],
                          'Vagnummer_Europavag': ['Ja' if r.get('europavag') == 1 else 'Nej' if r.get('europavag') == 0 else '' for r in ev]}))


def bygg(frusen, rot, ut):
    os.makedirs(ut, exist_ok=True)
    a, b = stationer(frusen), vagpunkter(rot)
    namn = ['stations.csv', 'elev.csv', 'elev_ifs.csv', 'geofeat.csv', 'geofeat2.csv', 'road_all.csv']
    s = {'stationer': len(a[0]), 'vagpunkter': len(b[0]), 'saknas': {}}
    for fil, x, y in zip(namn, a, b):
        d = pd.concat([x, y], ignore_index=True)
        if d.sid.duplicated().any(): raise ValueError(f'{fil}: dubbla sid')
        d.to_csv(f'{ut}/{fil}', index=False)
        for c in d.columns[1:]:
            m = int(d[c].isna().sum() + (d[c].astype(str) == '').sum()) if d[c].dtype == object else int(d[c].isna().sum())
            if m: s['saknas'][f'{fil}:{c}'] = m
    json.dump(s, open(f'{ut}/indata.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'indata: {s["stationer"]} stationer + {s["vagpunkter"]} vägpunkter → {ut}; saknas: {s["saknas"] or "inget"}')
    return s


def sjalvtest():
    fel = []
    with tempfile.TemporaryDirectory() as d:
        fr, rot, ut = f'{d}/frusen', f'{d}/rot', f'{d}/ut'
        os.makedirs(f'{fr}/ifs'); os.makedirs(f'{rot}/data/vagdata')
        pd.DataFrame({'sid': ['1001', '1002', '1003'], 'lon': [15, 16, 17], 'lat': [60, 61, 62]}).to_csv(f'{fr}/stations.csv', index=False)
        pd.DataFrame({'sid': ['1001', '1002'], 'elev': [100, 200], 'tpi1': [1, 2], 'tpi3': [3, 4]}).to_csv(f'{fr}/elev.csv', index=False)
        pd.DataFrame({'sid': ['1001', '1002'], **{c: [0.5, 0.6] for c in GEO1}}).to_csv(f'{fr}/geofeat.csv', index=False)
        pd.DataFrame({'sid': ['1001', '1002'], **{c: [1.0, 2.0] for c in GEO2}}).to_csv(f'{fr}/geofeat2.csv', index=False)
        pd.DataFrame({'sid': ['1001', '1002', '1002'], 'Trafik_Adt_samtliga_fordon': [1000, 2000, 2000], 'Trafik_Adt_tunga_fordon': [100, 200, 200],
                      'Vagunderhallsklass_Vagunderhallsklass': [1, 2, 2], 'FunkVagklass_Klass': [0, 3, 3], 'Vagnummer_Europavag': ['Ja', 'Nej', 'Nej']}).to_csv(f'{fr}/road_all.csv', index=False)
        for s, e in (('1001', 120.0), ('1002', 190.0)):                       # 1003 has no ifs file and is left out, as common.load does
            pd.DataFrame({'time': ['2024-10-10T00:00'], 'elev_ifs': [e]}).to_csv(f'{fr}/ifs/{s}.csv', index=False)
        w = lambda f, rader: json.dump({'rader': rader}, open(f'{rot}/data/vagdata/{f}', 'w', encoding='utf-8'))
        w('vaglagspunkter.json', [{'id': '1@0', 'lon': 14.0, 'lat': 58.0, 'adt_lastbilar': 50}, {'id': '1@2', 'lon': 14.1, 'lat': 58.1, 'adt_lastbilar': None}])
        w('vaglagspunkter-sardrag.json', [{'sid': '00000', 'elev': 50.0, 'tpi1': 0.1, 'tpi3': 0.2, **{c: 0.3 for c in GEO1}, **{c: 0.4 for c in GEO2}},
                                          {'sid': '00001', 'elev': 60.0, 'tpi1': 0.1, 'tpi3': 0.2, **{c: 0.3 for c in GEO1}, **{c: 0.4 for c in GEO2}}])
        w('vaglagspunkter-vinterklass.json', [{'sid': '00000', 'uh_klass': 2}, {'sid': '00001', 'uh_klass': None}])
        w('vaglagspunkter-europavag.json', [{'sid': '00000', 'europavag': 1}, {'sid': '00001', 'europavag': 0}])
        w('vaglagspunkter-adt-klass.json', [{'sid': '00000', 'adt_fordon': 500, 'klass': 1}, {'sid': '00001', 'adt_fordon': None, 'klass': 4}])
        s = bygg(fr, rot, ut)
        st = pd.read_csv(f'{ut}/stations.csv', dtype={'sid': str}); ei = pd.read_csv(f'{ut}/elev_ifs.csv', dtype={'sid': str}).set_index('sid')
        rd = pd.read_csv(f'{ut}/road_all.csv', dtype={'sid': str}).set_index('sid')
        if not (s['stationer'] == 2 and s['vagpunkter'] == 2 and list(st.sid) == ['1001', '1002', 'v00000', 'v00001']): fel.append(f'raderna: {list(st.sid)}')
        if not (ei.loc['1001', 'elev_ifs'] == 120.0 and ei.loc['v00000', 'elev_ifs'] == 50.0): fel.append(f'elev_ifs: stationen ur ifs, vägpunkten = elev: {ei.to_dict()}')
        if not (rd.loc['v00000', 'Vagnummer_Europavag'] == 'Ja' and rd.loc['v00001', 'Vagnummer_Europavag'] == 'Nej' and rd.loc['v00000', 'Trafik_Adt_samtliga_fordon'] == 500
                and rd.loc['v00000', 'Trafik_Adt_tunga_fordon'] == 50 and rd.loc['v00000', 'Vagunderhallsklass_Vagunderhallsklass'] == 2 and rd.loc['v00001', 'FunkVagklass_Klass'] == 4
                and rd.loc['1002', 'FunkVagklass_Klass'] == 3):
            fel.append(f'vägdata: {rd.to_dict()}')
        if not (pd.isna(rd.loc['v00001', 'Trafik_Adt_samtliga_fordon']) and pd.isna(rd.loc['v00001', 'Vagunderhallsklass_Vagunderhallsklass'])): fel.append('saknade värden stannar tomma')
        if s['saknas'].get('road_all.csv:Trafik_Adt_samtliga_fordon') != 1 or s['saknas'].get('road_all.csv:Trafik_Adt_tunga_fordon') != 1: fel.append(f'saknas räknas: {s["saknas"]}')
        # The chain's loader reads the result: meta with elev_ifs, and the feature files by sid.
        sys.path[:0] = [os.path.dirname(os.path.abspath(__file__))]
        from kandidat_fysik import las_meta
        meta = las_meta(ut)
        if not (len(meta) == 4 and meta.elev_ifs.iloc[0] == 120.0 and meta.elev.iloc[2] == 50.0): fel.append(f'kedjans läsare: {meta.to_dict()}')
    for f in fel: print('✗', f)
    if fel: sys.exit(1)
    print('✓ självtest: stationerna ur den frysta indatan (bara de med ifs-fil, elev_ifs ur ifs), vägpunkterna ur data/vagdata (v + sid, elev_ifs = elev, '
          'Lastkajens ÅDT och klass, tunga ur vägdatalagret, vinterklassen, Europaväg Ja/Nej), tomma värden räknas, och kedjans läsare läser resultatet')


if __name__ == '__main__':
    if '--sjalvtest' in sys.argv:
        sjalvtest(); sys.exit(0)
    ap = argparse.ArgumentParser()
    ap.add_argument('--frusen', required=True); ap.add_argument('--rot', default='.'); ap.add_argument('--ut', required=True)
    a = ap.parse_args()
    bygg(a.frusen, a.rot, a.ut)
