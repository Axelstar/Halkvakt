"""The candidate's fixed features at the road-condition points (DECISIONS #553, kort #303, #342).

The correction in the frozen candidate reads some twenty-five fixed features per place (kedja.base_features_mn): height and terrain,
forest, water, built-up land and road data. They exist only for the stations (elev.csv, geofeat.csv, geofeat2.csv, road_all.csv in
Axel's indata release). Axel's frozen scripts fetch_elev.py, geofeat.py and geofeat2.py (sha256 in fysik/SHA256SUMS) compute the
terrain ones from open rasters for every row of data/stations.csv; .github/workflows/vagpunkter-sardrag.yml runs them unchanged,
first on the stations (to show that they reproduce the release) and then on the 12 960 road-condition points in parts. This file
does only what the frozen scripts do not:
  python3 fysik/vagpunkter/vagpunkter.py stationer --ut <stations.csv> [--del i --delar n]   the points as stations.csv (sid, lon, lat)
  python3 fysik/vagpunkter/vagpunkter.py elev-ifs --stationer <stations.csv> --ut <csv>     the ECMWF cell height Open-Meteo reports
  python3 fysik/vagpunkter/vagpunkter.py jamfor --ny <dir> --frusen <dir>                   the reproduction, aggregates only
  python3 fysik/vagpunkter/vagpunkter.py sammanstall --delar <dir> --ut <csv>              the parts joined, missing values counted
  python3 fysik/vagpunkter/vagpunkter.py --sjalvtest                                        synthetic data only; runs in ci.yml
elev-ifs asks the archive endpoint fetch_ifs.py uses, with its models, coordinate rounding and ten places per call, for one day and
one variable: fetch_ifs.py fetches the whole winter in seven variables, which for 12 960 points would exceed Open-Meteo's free limit,
and only the reported height is needed here. The reproduction compares it with the release's ifs/<sid>.csv.
"""
import argparse, glob, hashlib, json, os, sys, tempfile, time, urllib.error, urllib.request
import numpy as np
import pandas as pd

ROT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
PUNKTER = f'{ROT}/data/vagdata/vaglagspunkter.json'
FILER = ('elev.csv', 'geofeat.csv', 'geofeat2.csv', 'elev_ifs.csv')
# The fixed features kedja.base_features_mn reads, per file (the road features come from the road data layer, not from here).
RATTELSEN = {'elev.csv': ['elev', 'tpi1', 'tpi3'], 'geofeat.csv': ['svf', 'horizon_south', 'tree100', 'chm30', 'water1000', 'built300'],
             'geofeat2.csv': ['tpi2km', 'tpi5km', 'tpi10km', 'tpi20km', 'vdepth5km', 'vdepth10km'], 'elev_ifs.csv': ['elev_ifs']}
TOL = 1e-6


def punkter_tabell(punkter):
    """The points with sid = the row number (five digits): 21 ids occur twice at different places (13/10), and the frozen scripts
    key on sid, so the id cannot be the key. id, lon and lat follow the row into the joined table."""
    r = json.load(open(punkter, encoding='utf-8'))['rader']
    return pd.DataFrame({'sid': [f'{i:05d}' for i in range(len(r))], 'id': [str(x['id']) for x in r],
                         'lon': [x['lon'] for x in r], 'lat': [x['lat'] for x in r]})


def stationer(punkter, ut, delnr=0, delar=1):
    """The road-condition points as the frozen scripts' stations.csv (sid, lon, lat); part delnr of delar contiguous parts."""
    df = punkter_tabell(punkter)
    df = df.iloc[np.array_split(np.arange(len(df)), delar)[delnr]]
    df[['sid', 'lon', 'lat']].to_csv(ut, index=False)
    return len(df)


def url_elev_ifs(rader):
    return ("https://archive-api.open-meteo.com/v1/archive?latitude=" + ",".join(f"{r.lat:.4f}" for r in rader) +
            "&longitude=" + ",".join(f"{r.lon:.4f}" for r in rader) +
            "&start_date=2024-10-10&end_date=2024-10-10&hourly=temperature_2m&models=ecmwf_ifs&timezone=GMT")


def elev_ifs(stations, ut, hamta=None):
    meta = pd.read_csv(stations, dtype={'sid': str})
    hamta = hamta or (lambda url: json.load(urllib.request.urlopen(url, timeout=120)))
    rad = []
    for i in range(0, len(meta), 10):
        ch = list(meta.iloc[i:i + 10].itertuples())
        for forsok in range(30):
            try:
                d = hamta(url_elev_ifs(ch)); break
            except urllib.error.HTTPError as e:
                print('HTTP', e.code, e.read()[:200], flush=True); time.sleep(65)
            except Exception as e:
                print('FEL', e, flush=True); time.sleep(20)
        else:
            sys.exit('elev-ifs: gav upp')
        d = d if isinstance(d, list) else [d]
        rad += [(r.sid, x.get('elevation')) for r, x in zip(ch, d)]
        if i % 1000 == 0: print(i, flush=True)
    pd.DataFrame(rad, columns=['sid', 'elev_ifs']).to_csv(ut, index=False)
    return len(rad)


def jamfor(ny, frusen):
    """Column by column: n, share equal within TOL, max |difference|. Returns the lines and whether every correction column reproduced."""
    rader, ok = [], True
    fr_ifs = None
    if os.path.isdir(f'{frusen}/ifs'):
        fr_ifs = pd.DataFrame([(os.path.basename(f)[:-4], pd.read_csv(f, usecols=['elev_ifs'], nrows=1).elev_ifs.iloc[0])
                               for f in glob.glob(f'{frusen}/ifs/*.csv')], columns=['sid', 'elev_ifs'])
    for fil in FILER:
        a = pd.read_csv(f'{ny}/{fil}', dtype={'sid': str}).set_index('sid')
        b = fr_ifs.set_index('sid') if fil == 'elev_ifs.csv' and fr_ifs is not None else pd.read_csv(f'{frusen}/{fil}', dtype={'sid': str}).set_index('sid')
        gem = a.index.intersection(b.index)
        rader.append(f'{fil}: {len(a)} nya, {len(b)} frusna, {len(gem)} gemensamma')
        for k in [c for c in b.columns if c in a.columns]:
            x = pd.to_numeric(a.loc[gem, k], errors='coerce').to_numpy(float); y = pd.to_numeric(b.loc[gem, k], errors='coerce').to_numpy(float)
            bada = np.isfinite(x) & np.isfinite(y)
            d = np.abs(x[bada] - y[bada])
            lika = np.mean(d <= TOL * np.maximum(1, np.abs(y[bada]))) if bada.any() else float('nan')
            nan_lika = int((np.isnan(x) == np.isnan(y)).sum())
            rattelsen = k in RATTELSEN[fil]
            if rattelsen and not (bada.any() and lika == 1 and nan_lika == len(gem)): ok = False
            rader.append(f"  {'*' if rattelsen else ' '} {k}: {100 * lika:.2f} % lika (n {int(bada.sum())}), största skillnad "
                         f"{(d.max() if d.size else float('nan')):.6g}, saknas lika {nan_lika}/{len(gem)}")
    return rader, ok


def sammanstall(delar, ut, punkter=PUNKTER):
    """The parts' four files joined on sid, with each point's id, lon and lat; returns rows, sha256, the missing count per correction
    column and the number of rows whose id occurs more than once."""
    tab = None
    for fil in FILER:
        d = pd.concat([pd.read_csv(f, dtype={'sid': str}) for f in sorted(glob.glob(f'{delar}/*/{fil}'))], ignore_index=True)
        if d.sid.duplicated().any(): raise ValueError(f'{fil}: samma punkt i två delar')
        d = d[['sid'] + RATTELSEN[fil]]
        tab = d if tab is None else tab.merge(d, on='sid', how='outer')
    p = punkter_tabell(punkter)
    if not set(tab.sid) <= set(p.sid): raise ValueError('en del har punkter som inte finns bland väglagspunkterna')
    tab = p.merge(tab, on='sid', how='right').sort_values('sid').reset_index(drop=True)
    tab.to_csv(ut, index=False, float_format='%.6g', lineterminator='\n')
    saknas = {k: int(tab[k].isna().sum()) for k in tab.columns if k not in ('sid', 'id', 'lon', 'lat')}
    return len(tab), hashlib.sha256(open(ut, 'rb').read()).hexdigest(), saknas, int(p.id.duplicated(keep=False).sum())


def sjalvtest():
    fel = []
    with tempfile.TemporaryDirectory() as d:
        json.dump({'rader': [{'id': f'{min(i, 23)}@0', 'lon': 15 + i / 100, 'lat': 60 + i / 100} for i in range(25)]}, open(f'{d}/p.json', 'w'))
        n = [stationer(f'{d}/p.json', f'{d}/s{i}.csv', i, 4) for i in range(4)]
        alla = pd.concat([pd.read_csv(f'{d}/s{i}.csv', dtype={'sid': str}) for i in range(4)])
        if sum(n) != 25 or alla.sid.nunique() != 25 or list(alla.columns) != ['sid', 'lon', 'lat']: fel.append(f'delarna täcker alla en gång: {n}')
        u = url_elev_ifs(list(alla.head(2).itertuples()))
        if '&models=ecmwf_ifs' not in u or 'latitude=60.0000,60.0100' not in u or 'start_date=2024-10-10&end_date=2024-10-10' not in u: fel.append(f'adressen: {u}')
        svar = lambda url: [{'elevation': 100.0 + k} for k in range(url.split('latitude=')[1].split('&')[0].count(',') + 1)]
        if elev_ifs(f'{d}/s0.csv', f'{d}/e.csv', svar) != n[0] or pd.read_csv(f'{d}/e.csv').elev_ifs.iloc[1] != 101.0: fel.append('elev-ifs läser höjden')
        for x in ('ny', 'fr', 'delar/0', 'delar/1'): os.makedirs(f'{d}/{x}')
        sids = [f'{i:05d}' for i in range(6)]
        def skriv(rot, ix, forskj=0.0):
            s = [sids[i] for i in ix]
            pd.DataFrame({'sid': s, 'elev': [100.0 + i for i in ix], 'tpi1': 1.0, 'tpi3': 2.0}).to_csv(f'{rot}/elev.csv', index=False)
            pd.DataFrame({'sid': s, 'svf': 0.99, 'horizon_south': 3.0 + forskj, 'tree100': 0.5, 'chm30': 4.0, 'water1000': 0.1, 'built300': 0.0,
                          'open30': 0.2}).to_csv(f'{rot}/geofeat.csv', index=False)
            pd.DataFrame({'sid': s, **{c: 1.0 for c in RATTELSEN['geofeat2.csv']}}).to_csv(f'{rot}/geofeat2.csv', index=False)
            pd.DataFrame({'sid': s, 'elev_ifs': [90.0 + i for i in ix]}).to_csv(f'{rot}/elev_ifs.csv', index=False)
        skriv(f'{d}/ny', range(6)); skriv(f'{d}/fr', range(6))
        r, ok = jamfor(f'{d}/ny', f'{d}/fr')
        if not ok or not any('* horizon_south: 100.00 % lika' in x for x in r): fel.append(f'lika filer reproducerar: {r[:4]}')
        skriv(f'{d}/ny', range(6), forskj=0.5)
        r, ok = jamfor(f'{d}/ny', f'{d}/fr')
        if ok or not any('* horizon_south: 0.00 % lika' in x for x in r): fel.append('en ändrad kolumn som rättelsen läser fälls')
        skriv(f'{d}/delar/0', range(3)); skriv(f'{d}/delar/1', range(3, 6))
        g = pd.read_csv(f'{d}/delar/1/geofeat.csv', dtype={'sid': str}); g.loc[0, 'svf'] = np.nan; g.to_csv(f'{d}/delar/1/geofeat.csv', index=False)
        rad, sha, saknas, dubbl = sammanstall(f'{d}/delar', f'{d}/ut.csv', f'{d}/p.json')
        ut = pd.read_csv(f'{d}/ut.csv', dtype={'sid': str})
        if rad != 6 or saknas['svf'] != 1 or sum(saknas.values()) != 1 or len(sha) != 64 or 'open30' in ut.columns or dubbl != 2 \
                or list(ut.columns[:4]) != ['sid', 'id', 'lon', 'lat'] or ut.id.iloc[2] != '2@0':
            fel.append(f'sammanställningen: {rad} rader, saknas {saknas}, dubbletter {dubbl}, {list(ut.columns[:4])}')
        skriv(f'{d}/delar/1', range(2, 6))
        try: sammanstall(f'{d}/delar', f'{d}/ut2.csv', f'{d}/p.json'); fel.append('samma punkt i två delar fälls')
        except ValueError: pass
    for f in fel: print('✗', f)
    if fel: sys.exit(1)
    print('✓ självtest: delarna täcker varje punkt en gång (nyckeln är radnumret, och dubbletter av id räknas), elev-ifs frågar som fetch_ifs.py och läser höjden, reproduktionen fäller en '
          'ändrad kolumn som rättelsen läser, sammanställningen tar rättelsens kolumner och räknar det som saknas, och dubbletter fälls')


if __name__ == '__main__':
    if '--sjalvtest' in sys.argv:
        sjalvtest(); sys.exit(0)
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest='cmd', required=True)
    a1 = sp.add_parser('stationer'); a1.add_argument('--ut', required=True); a1.add_argument('--del', type=int, default=0); a1.add_argument('--delar', type=int, default=1)
    a2 = sp.add_parser('elev-ifs'); a2.add_argument('--stationer', required=True); a2.add_argument('--ut', required=True)
    a3 = sp.add_parser('jamfor'); a3.add_argument('--ny', required=True); a3.add_argument('--frusen', required=True)
    a4 = sp.add_parser('sammanstall'); a4.add_argument('--delar', required=True); a4.add_argument('--ut', required=True)
    a = ap.parse_args()
    if a.cmd == 'stationer':
        d = getattr(a, 'del')
        print(f'stations.csv: {stationer(PUNKTER, a.ut, d, a.delar)} punkter (del {d} av {a.delar})')
    elif a.cmd == 'elev-ifs':
        print(f'elev_ifs.csv: {elev_ifs(a.stationer, a.ut)} punkter')
    elif a.cmd == 'jamfor':
        rader, ok = jamfor(a.ny, a.frusen)
        print('REPRODUKTIONEN (DECISIONS #553): Axels frysta skript på stationerna mot indata-releasen; * = kolumner rättelsen läser')
        for r in rader: print(r)
        print('alla kolumner rättelsen läser reproducerade' if ok else 'INTE REPRODUCERAT: minst en kolumn som rättelsen läser skiljer sig')
        sys.exit(0 if ok else 1)
    else:
        rad, sha, saknas, dubbl = sammanstall(a.delar, a.ut)
        print(f'{a.ut}: {rad} punkter, sha256 {sha}; saknas per kolumn: {saknas}; {dubbl} rader bär ett id som förekommer mer än en gång')
