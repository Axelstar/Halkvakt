"""Overnight experiments. Protocol: spatial folds from KMeans(25)%5. Development folds {0,1,2} choose configs;
confirmation folds {3,4} give the reported numbers. All first-stage predictions are out-of-fold (region held out)."""
import os, json, time, sys
import numpy as np, pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.cluster import KMeans
from common import load, gates, D as DD
from physics import run
from layers import dist_matrix, idw_neighbours

T0 = time.time()
meta, idx, F, obs, aux = load()
nh, ns = obs.shape
p = json.load(open('/home/claude/fys/params_v2.json'))
Ts = run(F, p)
km = KMeans(n_clusters=25, n_init=4, random_state=0).fit(meta[['lon', 'lat']].to_numpy() * [0.55, 1])
fold = km.labels_ % 5
DEV = np.isin(fold, [0, 1, 2]); CONF = ~DEV
lat = meta.lat.to_numpy()
Dm = dist_matrix(meta)
one = np.ones((nh, 1))
hr = np.array([t.hour for t in idx])


def roll(a, w, fn='mean'):
    r = pd.DataFrame(a).rolling(w, min_periods=1)
    return {'mean': r.mean, 'sum': r.sum, 'min': r.min, 'max': r.max}[fn]().to_numpy()


def hours_since(cond, cap=240):
    out = np.empty(cond.shape, np.float32); c = np.full(cond.shape[1], float(cap))
    for h in range(cond.shape[0]):
        c = np.where(cond[h], 0.0, np.minimum(c + 1, cap)); out[h] = c
    return out


def S(v): return one * np.asarray(v, float)[None, :]


def base_features():
    feat = {
        'ts': Ts, 'ta': F['ta'], 'td': F['td'], 'wind': F['wind'], 'cloud': F['cloud'], 'sw': F['sw'],
        'ts_ta': Ts - F['ta'], 'ta_td': F['ta'] - F['td'],
        'cloud6': roll(F['cloud'], 6), 'cloud24': roll(F['cloud'], 24), 'sw24': roll(F['sw'], 24),
        'pr6': roll(F['precip'], 6, 'sum'), 'pr24': roll(F['precip'], 24, 'sum'),
        'sn24': roll(F['snowfall'], 24, 'sum'), 'sn72': roll(F['snowfall'], 72, 'sum'),
        'dta3': F['ta'] - np.vstack([F['ta'][:3], F['ta'][:-3]]), 'dts3': Ts - np.vstack([Ts[:3], Ts[:-3]]),
        'ta24': roll(F['ta'], 24), 'ta72': roll(F['ta'], 72), 'tdeep': F['tdeep'],
        'hs': np.sin(2 * np.pi * hr / 24)[:, None] * np.ones((1, ns)), 'hc': np.cos(2 * np.pi * hr / 24)[:, None] * np.ones((1, ns)),
        'elev_ifs': S(meta.elev_ifs), 'elev': S(meta.elev), 'elev_diff': S(meta.elev - meta.elev_ifs),
        'tpi1': S(meta.tpi1), 'tpi3': S(meta.tpi3),
    }
    feat['tpi3_clear_calm'] = feat['tpi3'] * (1 - F['cloud']) / np.maximum(F['wind'], 1)
    fr = {s: pd.read_csv(f'{DD}/ifs2/{s}.csv', parse_dates=['time']).set_index('time').reindex(idx) for s in meta.sid}
    for c, nm in [('snow_depth', 'snowd'), ('soil_temperature_0_to_7cm', 'soil0'), ('cloud_cover_low', 'cloudlow')]:
        feat[nm] = pd.DataFrame(np.column_stack([fr[s][c].to_numpy(float) for s in meta.sid])).ffill().bfill().to_numpy()
    feat['cloudlow6'] = roll(feat['cloudlow'], 6)
    Rd = pd.read_csv(f'{DD}/road_all.csv', dtype={'sid': str}).drop_duplicates('sid').set_index('sid').reindex(meta.sid)
    G1 = pd.read_csv(f'{DD}/geofeat.csv', dtype={'sid': str}).set_index('sid').reindex(meta.sid)
    G2 = pd.read_csv(f'{DD}/geofeat2.csv', dtype={'sid': str}).set_index('sid').reindex(meta.sid)
    feat['adt_log'] = S(np.log10(Rd.Trafik_Adt_samtliga_fordon.clip(lower=10)))
    feat['heavy_share'] = S(Rd.Trafik_Adt_tunga_fordon / Rd.Trafik_Adt_samtliga_fordon)
    feat['uh_klass'] = S(pd.to_numeric(Rd.Vagunderhallsklass_Vagunderhallsklass, errors='coerce'))
    feat['funk_klass'] = S(pd.to_numeric(Rd.FunkVagklass_Klass, errors='coerce'))
    feat['e_road'] = S((Rd.Vagnummer_Europavag == 'Ja').astype(float))
    for c in ['tpi2km', 'tpi5km', 'tpi10km', 'tpi20km', 'vdepth5km', 'vdepth10km']: feat[c] = S(G2[c])
    for c in ['svf', 'horizon_south', 'tree100', 'chm30', 'water1000', 'built300']: feat[c] = S(G1[c])
    calm_clear = (1 - F['cloud']) / np.maximum(F['wind'], 1)
    feat['tpi5km_cc'] = feat['tpi5km'] * calm_clear
    feat['adt_cold'] = feat['adt_log'] * (F['ta'] < 0)
    return {k: np.asarray(v, np.float32) for k, v in feat.items()}


def state_features(feat):
    """Road-state memory: what has happened to this road in the last days."""
    feat['swe'] = F['swe']
    feat['ts_min24'] = roll(Ts, 24, 'min'); feat['ts_max24'] = roll(Ts, 24, 'max')
    feat['ts_min72'] = roll(Ts, 72, 'min'); feat['ts_max72'] = roll(Ts, 72, 'max')
    feat['ta_min24'] = roll(F['ta'], 24, 'min'); feat['ta_max72'] = roll(F['ta'], 72, 'max')
    feat['fdh72'] = roll(np.minimum(F['ta'], 0), 72, 'sum')          # freezing degree-hours
    feat['tdh72'] = roll(np.maximum(F['ta'], 0), 72, 'sum')          # thaw degree-hours
    feat['h_since_thaw'] = hours_since(Ts > 0.5)
    feat['h_since_frost'] = hours_since(Ts < -0.5)
    feat['h_since_precip'] = hours_since(F['precip'] > 0.1)
    feat['h_since_snow'] = hours_since(F['snowfall'] > 0.1)
    feat['sn168'] = roll(F['snowfall'], 168, 'sum'); feat['pr72'] = roll(F['precip'], 72, 'sum')
    feat['rain_on_frozen'] = (F['precip'] > 0.1) * (F['ta'] < 1) * (F['snowfall'] < 0.05)
    feat['snowd_x_cold'] = feat['snowd'] * (feat['ta72'] < -1)
    feat['sw_x_snowd'] = feat['sw'] * (feat['snowd'] > 0.02)
    feat['clear_calm_night'] = (1 - F['cloud']) / np.maximum(F['wind'], 1) * (F['sw'] < 5)
    return {k: np.asarray(v, np.float32) for k, v in feat.items()}


def gather(feat, names, cols, rows=None):
    """Build a design matrix for station columns `cols` without materialising the full (nh, ns, nf) cube."""
    if rows is None:
        return np.stack([np.asarray(feat[k][:, cols], np.float32).reshape(-1) for k in names], -1)
    return np.stack([np.asarray(feat[k][:, cols], np.float32).reshape(-1)[rows] for k in names], -1)


def fit_oof(feat, names, max_rows=1_400_000, iters=700, lr=0.06, leaves=63, msl=300, l2=1.0, seed=0, folds=range(5), target=None):
    y = (obs - Ts) if target is None else target
    pred = np.full_like(Ts, np.nan); rng = np.random.default_rng(seed)
    for f in folds:
        trs = np.where(fold != f)[0]; tes = np.where(fold == f)[0]
        yt = y[:, trs].reshape(-1); ot = obs[:, trs].reshape(-1)
        sel = np.where(np.isfinite(yt) & (ot <= 10))[0]
        if len(sel) > max_rows: sel = rng.choice(sel, max_rows, replace=False)
        Xt = gather(feat, names, trs, sel)
        m = HistGradientBoostingRegressor(max_iter=iters, learning_rate=lr, max_leaf_nodes=leaves,
                                          min_samples_leaf=msl, l2_regularization=l2, random_state=seed)
        m.fit(Xt, yt[sel]); del Xt
        pred[:, tes] = Ts[:, tes] + m.predict(gather(feat, names, tes)).reshape(nh, len(tes))
        print(f'   fold {f} {round(time.time()-T0)} s', flush=True)
    return pred


def report(tag, pred, extra=None):
    def A2(mask=None): return 100 * gates(obs, pred, mask)['A2']
    mD = np.zeros_like(obs, bool); mD[:, DEV] = True
    mC = np.zeros_like(obs, bool); mC[:, CONF] = True
    mN = np.zeros_like(obs, bool); mN[:, lat >= 62] = True
    s = f'{tag:40s} dev {A2(mD):.2f}% | CONF {A2(mC):.2f}% | all {A2():.2f}% | north {A2(mN):.2f}% | south {A2(~mN):.2f}%'
    if extra: s += ' | ' + extra
    print(s, flush=True)
    with open('/home/claude/fys/overnight.log', 'a') as fh: fh.write(s + '\n')
    return s


def with_neighbours(pred, rmin, L=100.0, shrink=0.5, k=8):
    corr, ank = idw_neighbours(Dm, obs - pred, rmin=rmin, rmax=rmin + 300, k=k, wfun=lambda d: np.exp(-d / L), shrink=shrink)
    return pred + np.nan_to_num(corr), ank
