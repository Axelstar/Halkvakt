"""The frozen candidate for the winter 2026/27 (DECISIONS #544 point 6, #549; kort #342): the chosen procedure recomputed on all stations.

  cd /home/claude/fys && python3 niva2/frysta.py --val <repo>/kuvos/kandidat-2026-27-val.json --metnordic <analysis.csv.gz> --ut <dir>

The choice file is written in the repo after the honest runs and before the button: the physics ('lw' = vagb.py's, 'terrang' =
vagb_terrang.py's), the blend pair chosen on all folds, the honest run it comes from and the decision. Here, on all stations at once:
  (a) the physics' parameters calibrated with the chain's protocol (Nelder–Mead, A1 + 5·A2, maxfev 120) from physics.DEFAULT
      (+ q_trafik_adt 0 for 'terrang'): kedja.kalibrera gets every fold even, so it trains on all stations and has none to read;
  (b) the physics run with them, the features built, and one correction trained on all stations (vagb.modell_utom with a fold no
      station has) with the frozen A2_KONFIG;
  (c) the blend pair and the frozen replica (its sha256 in fysik/SHA256SUMS) written beside them.
Out in <ut>/frysta/: modell.pkl (the correction, pickled with the pinned scikit-learn in fysik/requirements.txt) and kandidat.json (the
choice, the parameters, the feature order, the versions, modell.pkl's size and sha256, and the numbers on the stations the procedure
trained on — which are NOT the candidate's expected error; the honest number is, #544 point 6). The model is trained on Trafikverket's
rows and goes to the private bucket (Bengt 13/10: "i hinken"); kandidat.json is aggregates and goes in the repo. The self-test is in
sjalvtest.py.
"""
import argparse, hashlib, json, os, pickle, platform, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.dirname(HERE), os.path.join(os.path.dirname(HERE), 'blandning')]
import common, kedja, vagb
from fysik_lw import run_lw
from kedja import kalibrera, base_features_mn, state_features_mn, gather, rapport, logg, A2_KONFIG
from vagb import modell_utom
from vagb_blandning import GRID, GRID2

FYSIK = ('lw', 'terrang')


def las_val(fil):
    v = json.load(open(fil, encoding='utf-8'))
    if v.get('fysik') not in FYSIK:
        raise ValueError(f"valfilen: fysik {v.get('fysik')!r}, väntat {FYSIK}")
    if (v.get('W'), v.get('L_km')) not in set(GRID) | set(GRID2):
        raise ValueError(f"valfilen: paret W {v.get('W')} · L {v.get('L_km')} km finns inte i varv 1:s eller varv 2:s rutnät")
    if not str(v.get('beslut', '')).startswith('#') or not v.get('korning'):
        raise ValueError('valfilen: beslut (#NNN) och den ärliga körningen saknas')
    return v


def sha(fil):
    return hashlib.sha256(open(fil, 'rb').read()).hexdigest()


def frys(meta, idx, F, obs, val, maxfev, ut, konfig=A2_KONFIG):
    """(a)–(c) on all stations. F must already carry terrang()'s keys for 'terrang'. Returns the manifest (also written)."""
    if val['fysik'] == 'terrang':
        import vagb_terrang
        vagb_terrang.koppla()
    elif kedja.run_lw is not run_lw or vagb.run_lw is not run_lw:
        raise RuntimeError("fysiken 'lw' men kedjan är kopplad till en annan fysik i den här processen")
    ns = len(meta)
    alla = np.zeros(ns, int)
    p, k = kalibrera(F, obs, alla, dict(vagb.DEFAULT), maxfev)
    logg(f"kalibrerat på alla {ns} stationer efter {k['evals']} utvärderingar: A1 {k['train']['A1']:.3f} °C, A2 {100 * k['train']['A2']:.2f} %")
    Ts, T5 = vagb.run_lw(F, p)
    feat = state_features_mn(base_features_mn(meta, idx, F, Ts, T5), F, Ts)
    names = list(feat)
    m = modell_utom(feat, names, obs, Ts, alla, -1, **konfig)
    P = Ts + m.predict(gather(feat, names, np.arange(ns))).reshape(Ts.shape)
    os.makedirs(f'{ut}/frysta', exist_ok=True)
    fil = f'{ut}/frysta/modell.pkl'
    with open(fil, 'wb') as fh:
        pickle.dump(m, fh, protocol=5)
    with open(fil, 'rb') as fh:
        m2 = pickle.load(fh)
    rad = np.arange(0, Ts.shape[0], 97)
    X = gather({n: feat[n][rad] for n in names}, names, np.arange(ns))
    if not np.array_equal(m2.predict(X), m.predict(X)):
        raise RuntimeError('modell.pkl ger inte samma rättelse som modellen i minnet')
    import pandas, scipy, sklearn
    g_ts, g_p = common.gates(obs, Ts), common.gates(obs, P)
    kand = {
        '_om': ('Den frysta kandidaten för vintern 2026/27 (DECISIONS #544 punkt 6, #549), skriven av fysik/niva2/frysta.py i kuvösjobbet. '
                'modell.pkl ligger i hinken arkiv under kuvos/kuvos-kandidat-2026-27/ och aldrig i repot. Talen under i_urvalet är räknade '
                'på stationerna proceduren tränade på och är inte kandidatens väntade fel; det är det ärliga talet.'),
        'beslut': val['beslut'], 'korning': val['korning'], 'fysik': val['fysik'],
        'par': {'W': val['W'], 'L_km': val['L_km']},
        'replika_sha256': sha(os.path.join(os.path.dirname(HERE), 'kuvos_replica.py')),
        'parametrar': {kk: float(v) for kk, v in p.items()},
        'kalibrering': {'utvarderingar': k['evals'], 'maxfev': maxfev, 'start': 'physics.DEFAULT', 'n': k['train']['n']},
        'sardrag': names,
        'rattelse': {kk: v for kk, v in konfig.items()},
        'stationer': ns, 'timmar': int(Ts.shape[0]), 'forsta_timme': str(idx[0]), 'sista_timme': str(idx[-1]),
        'i_urvalet': {'fysik': {kk: g_ts[kk] for kk in ('n', 'A1', 'A2')}, 'fysik_rattelse': {kk: g_p[kk] for kk in ('n', 'A1', 'A2')}},
        'versioner': {'python': platform.python_version(), 'numpy': np.__version__, 'pandas': pandas.__version__,
                      'scipy': scipy.__version__, 'scikit-learn': sklearn.__version__},
        'filer': [{'fil': 'modell.pkl', 'bytes': os.path.getsize(fil), 'sha256': sha(fil)}],
    }
    json.dump(kand, open(f'{ut}/frysta/kandidat.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    lat = meta.lat.to_numpy()
    rapport('den frysta kandidatens fysik, på stationerna den tränade på (inte det väntade felet)', obs, Ts, lat)
    rapport('den frysta kandidatens fysik + rättelse, på stationerna den tränade på (inte det väntade felet)', obs, P, lat)
    return kand


def kor(valfil, mn, ut, maxfev):
    from metnordic import load_mn
    val = las_val(valfil)
    meta, idx, F, obs, aux, t0 = load_mn(mn)
    logg(f"den frysta kandidaten (#544 punkt 6): {val['fysik']}, paret W {val['W']} · L {val['L_km']:g} km ur körning {val['korning']} "
         f"({val['beslut']}); {len(meta)} stationer, {len(idx)} timmar, MET Nordic från {t0}")
    if val['fysik'] == 'terrang':
        from terrang import terrang, tidsprov
        F, n = terrang(F, idx, meta, f'{common.D}/geofeat.csv')
        fore, efter = tidsprov(F, idx, meta)
        logg(f"terrängen: {n}; tidsprovet r = {fore:.4f} före, {efter:.4f} efter")
        if not fore > efter:
            sys.exit('frysta: kortvågen följer solen i timmen efter tidsstämpeln bättre — inget fryses')
    kand = frys(meta, idx, F, obs, val, maxfev, ut)
    logg('kandidat.json: ' + json.dumps(kand, ensure_ascii=False))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--val', required=True, help='kuvos/kandidat-2026-27-val.json')
    ap.add_argument('--metnordic', required=True)
    ap.add_argument('--ut', required=True)
    ap.add_argument('--maxfev', type=int, default=120)
    a = ap.parse_args()
    os.makedirs(a.ut, exist_ok=True)
    kor(a.val, a.metnordic, a.ut, a.maxfev)
    logg('klart')
