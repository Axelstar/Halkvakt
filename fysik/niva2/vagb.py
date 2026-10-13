"""Väg B (DECISIONS #544, kort #342): nivå 2 with honest numbers — every station's estimate from a chain that never saw its fold.

  cd /home/claude/fys && python3 niva2/vagb.py --metnordic <analysis.csv.gz> --prognos '<dir>/metnordic_prognos_*.csv.gz' --ut <dir>

For each fold f = 0…4 (kedja.veck, unchanged), only with the other four folds:
  (a) the ten physics parameters (kedja.KAL_NAMN) are calibrated with kedja's protocol (Nelder–Mead, A1 + 5·A2, maxfev 120), starting
      from the literature values in physics.DEFAULT — not params_v2.json, which was calibrated on folds 0/2/4. kedja.kalibrera trains
      on fold % 2 == 0 and reads fold % 2 == 1, so it gets the indicator (fold == f): it then trains on the four and reads fold f.
  (b) the physics runs for every station with those parameters, the features are built, and one correction model is trained on the
      four folds with the frozen A2_KONFIG (sample drawn with seed 0 for each fold); fold f's stations are predicted on the analysis.
  (c) the forecast restarts (prognos.py's method, DECISIONS #519) run for fold f's stations only — the column and the features are
      per station — with fold f's parameters and model; +6 h (steps 6–11) is kept, the lead #544 judges.
Out (in --ut, never outside the job): oof_vagb_analys.npy and oof_vagb_prognos6.npy (the chain's hours × stations, as prognos.py's
arrays), veck_vagb.json {sid: fold} and params_vagb_veck<f>.json. fysik/blandning/vagb_blandning.py chooses the blend weight per fold.
The self-test is in sjalvtest.py (the same synthetic winter): fold f's estimates do not move when fold f's measurements change.
"""
import argparse, glob, json, os, sys
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.dirname(HERE)]
from physics import DEFAULT
from fysik_lw import run_lw
from kedja import veck, kalibrera, base_features_mn, state_features_mn, gather, rapport, logg, A2_KONFIG
from prognos import las_prognos, vader, skarv, LEDTIDER, FONSTER

LEDTID = 6


def kolumner(F, ix):
    """The weather for a subset of stations: (hours × stations) arrays and per-station arrays are cut, everything else is kept."""
    return {k: (v[:, ix] if isinstance(v, np.ndarray) and v.ndim == 2 else v[ix] if isinstance(v, np.ndarray) and v.ndim == 1 else v)
            for k, v in F.items()}


def modell_utom(feat, names, obs, Ts, fold, f, max_rows=1_400_000, iters=700, lr=0.06, leaves=63, msl=300, l2=1.0, seed=0):
    """kedja.fit_oof's model for fold f alone: trained on the other four folds, the same rows (obs ≤ 10) and configuration."""
    trs = np.where(fold != f)[0]
    yt = (obs - Ts)[:, trs].reshape(-1); ot = obs[:, trs].reshape(-1)
    sel = np.where(np.isfinite(yt) & (ot <= 10))[0]
    rng = np.random.default_rng(seed)
    if len(sel) > max_rows: sel = rng.choice(sel, max_rows, replace=False)
    m = HistGradientBoostingRegressor(max_iter=iters, learning_rate=lr, max_leaf_nodes=leaves, min_samples_leaf=msl,
                                      l2_regularization=l2, random_state=seed)
    return m.fit(gather(feat, names, trs, sel), yt[sel])


def omstarter(meta, idx, F, Ts, T5, tillstand, p, modell, names, korningar, V):
    """prognos.prognoslage for one set of stations and one model, the lead class LEDTID only."""
    nh, ns = Ts.shape
    P = np.full((nh, ns), np.nan); TS = np.full((nh, ns), np.nan)
    karta = {t: i for i, t in enumerate(idx)}; steg = LEDTIDER[LEDTID]
    kor = utan = 0
    for r, kt in enumerate(korningar):
        hk = karta.get(kt)
        if hk is None or hk == 0 or (hk - 1) not in tillstand:
            utan += 1; continue
        a = max(0, hk - FONSTER)
        G, j, L, _ = skarv(F, hk, a, V, r, F['swe'][hk - 1])
        Fh = {k: (v[j:] if isinstance(v, np.ndarray) and v.ndim == 2 else v) for k, v in G.items()}
        Tsf, T5f = run_lw(Fh, p, T_init=tillstand[hk - 1])
        Tsw = Ts[a:hk + L].copy(); Tsw[j:] = Tsf
        T5w = T5[a:hk + L].copy(); T5w[j:] = T5f
        feat = state_features_mn(base_features_mn(meta, idx[a:hk + L], G, Tsw, T5w), G, Tsw)
        sl = [s for s in steg if s < L]
        if sl:
            rader = [j + s for s in sl]; tider = [hk + s for s in sl]
            X = np.stack([np.asarray(feat[k][rader], np.float32).reshape(-1) for k in names], -1)
            P[tider] = Tsf[sl] + modell.predict(X).reshape(len(rader), ns)
            TS[tider] = Tsf[sl]
        kor += 1
    return P, TS, dict(korningar=kor, utan_tillstand=utan)


def arlig(meta, idx, F, obs, korningar, V, maxfev=120, konfig=A2_KONFIG, ut=None):
    """Steps (a)–(c) for the five folds. Returns the analysis, +6 h and the physics alone (hours × stations), the folds and the
    five parameter sets."""
    nh, ns = obs.shape
    fold = veck(meta)
    karta = {t: i for i, t in enumerate(idx)}
    spara = sorted({karta[t] - 1 for t in korningar if t in karta and karta[t] > 0})
    P_an = np.full((nh, ns), np.nan); P_6 = np.full((nh, ns), np.nan); TS_an = np.full((nh, ns), np.nan); params = []
    for f in range(5):
        tes = np.where(fold == f)[0]
        p, k = kalibrera(F, obs, (fold == f).astype(int), dict(DEFAULT), maxfev)
        logg(f"veck {f} ({len(tes)} stationer): kalibrerat på de andra fyra efter {k['evals']} utvärderingar — där A2 {100 * k['train']['A2']:.2f} %; "
             f"veck {f} med fysiken ensam A2 {100 * k['test']['A2']:.2f} % (med litteraturvärdena {100 * k['test_start']['A2']:.2f} %)")
        params.append(p)
        if ut: json.dump(p, open(f'{ut}/params_vagb_veck{f}.json', 'w'))
        Ts, T5, tillstand = run_lw(F, p, spara=spara)
        feat = state_features_mn(base_features_mn(meta, idx, F, Ts, T5), F, Ts)
        names = list(feat)
        m = modell_utom(feat, names, obs, Ts, fold, f, **konfig)
        P_an[:, tes] = Ts[:, tes] + m.predict(gather(feat, names, tes)).reshape(nh, len(tes))
        TS_an[:, tes] = Ts[:, tes]
        del feat
        P6, _, n = omstarter(meta.iloc[tes].reset_index(drop=True), idx, kolumner(F, tes), Ts[:, tes], T5[:, tes],
                             {h: T[tes] for h, T in tillstand.items()}, p, m, names, korningar, {kk: v[:, :, tes] for kk, v in V.items()})
        P_6[:, tes] = P6
        logg(f"veck {f}: rättelsen tränad på de andra fyra; {n['korningar']} omstarter för veckets stationer ({n['utan_tillstand']} utanför kedjans timmar)")
    return P_an, P_6, TS_an, fold, params


def kor(mn, prognosfiler, ut, maxfev):
    from metnordic import load_mn
    meta, idx, F, obs, aux, t0 = load_mn(mn)
    lat = meta.lat.to_numpy()
    logg(f"väg B (#544): {len(meta)} stationer, {len(idx)} timmar, MET Nordics analys från {t0}; varje veck räknas bara med de andra fyra")
    korningar, A = las_prognos(prognosfiler, list(meta.sid))
    V, brus = vader(A); del A
    P_an, P_6, TS_an, fold, _ = arlig(meta, idx, F, obs, korningar, V, maxfev, ut=ut)
    json.dump({str(s): int(v) for s, v in zip(meta.sid, fold)}, open(f'{ut}/veck_vagb.json', 'w'))
    np.save(f'{ut}/oof_vagb_analys.npy', P_an)
    np.save(f'{ut}/oof_vagb_prognos{LEDTID}.npy', P_6)
    rapport('väg B fysik ensam (analys)', obs, TS_an, lat)
    rapport('väg B fysik + rättelse (analys)', obs, P_an, lat)
    rapport(f'väg B fysik + rättelse, +{LEDTID} h', obs, P_6, lat)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--metnordic', required=True)
    ap.add_argument('--prognos', required=True, help="glob för prognosfilerna")
    ap.add_argument('--ut', required=True)
    ap.add_argument('--maxfev', type=int, default=120)
    a = ap.parse_args()
    os.makedirs(a.ut, exist_ok=True)
    kor(a.metnordic, glob.glob(a.prognos), a.ut, a.maxfev)
    logg('klart')
