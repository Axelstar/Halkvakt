"""The physics chain run in the kuvös — the control on ECMWF and nivå 2 on MET Nordic (kort #319, DECISIONS #509).

  python kedja.py kontroll --ut <dir>                       the frozen chain (v4.py, expA.py's A2 configuration, the frozen
                                                            params_v2.json) rerun as it was: oof_A2 is saved and its sha256
                                                            printed next to the frozen 9268c6c7…; the output file goes to the kuvös
  python kedja.py niva2 --metnordic <fil> --ut <dir> [--maxfev N]
                                                            the same chain on MET Nordic: the physics recalibrated with calib2.py's
                                                            protocol (Nelder–Mead on folds 0/2/4, A1 + 5·A2), the learned correction
                                                            with the same configuration and folds, the three ECMWF-only inputs
                                                            replaced as fysik/README.md says
Both write <dir>/<namn>-fysik-2024-25.csv.gz (physics + correction) and <dir>/<namn>-ts-2024-25.csv.gz (physics alone), in the
FYSIK file's format (station_id,t_utc,fysik_c; on the half-hour the mean of the two hours), read by
scripts/matningar/kuvos-fysik-niva2-metnordic-2026-10-09.ts. Runs where the frozen chain runs: cwd /home/claude/fys (a link to
fysik/), data/ populated by prep.py and the indata release. The feature builders are copies of v4.py's, parametrised, because
v4.py loads its data at import and cannot be reused for another weather; the copy is line for line except the three replacements.
"""
import argparse, gzip, hashlib, json, os, sys, time
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sklearn.cluster import KMeans
from sklearn.ensemble import HistGradientBoostingRegressor

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.dirname(HERE)]          # niva2/ and fysik/ (the frozen modules), as sjalvtest.py does
import common
from common import gates
from physics import DEFAULT, SIGMA
from fysik_lw import run_lw

A2_KONFIG = dict(max_rows=1_400_000, iters=900, lr=0.05, leaves=95, msl=200)   # expA.py: "A2 + state, 2x data, 900 it, 95 leaves"
SNO_TACKE_MM = 2.0      # sw_x_snowd: ECMWF snow_depth > 0.02 m ≈ 2 mm water of fresh snow
VINTER_START = "2024-11-01T00:00:00"
T0 = time.time()


def logg(s):
    print(f"[{round(time.time() - T0)} s] {s}", flush=True)


def veck(meta):
    """v4.py: KMeans(25) on lon·0.55, lat; fold = label % 5. Same stations in the same order ⇒ the same folds."""
    km = KMeans(n_clusters=25, n_init=4, random_state=0).fit(meta[['lon', 'lat']].to_numpy() * [0.55, 1])
    return km.labels_ % 5


# ── Calibration: calib2.py's protocol. Two of its twelve parameters are inert with measured longwave and no height difference
#    (cloud_p only shapes the Brutsaert blend; lapse multiplies elev_diff = 0), so ten are moved. Start: the frozen params_v2.json
#    with r_snow 0.1 as calib2.py starts.
KAL_NAMN = ['albedo', 'ch', 'hmin', 'q_traffic', 'deep_off', 'sw_fac', 'r_snow', 'alb_snow', 'cover_swe', 'cover_t']
KAL_SKALA = np.array([0.1, 0.003, 4, 10, 2, 0.5, 0.1, 0.2, 10, 2])
KAL_LO = dict(albedo=0.02, cloud_p=0.3, ch=0.0002, hmin=0.2, sw_fac=0, r_snow=0, alb_snow=0.05, cover_swe=0.5)
KAL_HI = dict(albedo=0.6, sw_fac=1.5, alb_snow=0.9, r_snow=1.0)


def kalibrera(F, obs, fold, bas, maxfev):
    tr = np.where(fold % 2 == 0)[0]; te = np.where(fold % 2 == 1)[0]
    sub = lambda Fd, ix: {k: (v[:, ix] if v.ndim == 2 else v[ix]) for k, v in Fd.items()}
    Ftr, Fte = sub(F, tr), sub(F, te)
    x0 = np.array([bas.get(n, DEFAULT[n]) for n in KAL_NAMN]); x0[KAL_NAMN.index('r_snow')] = 0.1

    def P(z):
        x = x0 + z * KAL_SKALA; p = dict(bas); p.update(dict(zip(KAL_NAMN, x)))
        for k, v in KAL_LO.items(): p[k] = max(p[k], v)
        for k, v in KAL_HI.items(): p[k] = min(p[k], v)
        return p
    best = [9e9]

    def f(z):
        g = gates(obs[:, tr], run_lw(Ftr, P(z))[0]); v = g['A1'] + 5 * g['A2']
        if v < best[0]:
            best[0] = v; logg(f"  kalibrering {round(v, 4)} A1 {round(g['A1'], 3)} A2 {round(g['A2'], 3)} " + str({k: round(float(P(z)[k]), 4) for k in KAL_NAMN}))
        return v
    n = len(KAL_NAMN); sim = np.vstack([np.zeros(n)] + [np.eye(n)[i] * 0.8 for i in range(n)])
    r = minimize(f, np.zeros(n), method='Nelder-Mead', options=dict(maxfev=maxfev, xatol=0.01, fatol=1e-5, initial_simplex=sim))
    p = P(r.x)
    return p, dict(train=gates(obs[:, tr], run_lw(Ftr, p)[0]), test=gates(obs[:, te], run_lw(Fte, p)[0]),
                   test_start=gates(obs[:, te], run_lw(Fte, bas)[0]), evals=int(r.nfev))


# ── Features: v4.py's base_features and state_features, parametrised; the three replacements are marked.
def roll(a, w, fn='mean'):
    r = pd.DataFrame(a).rolling(w, min_periods=1)
    return {'mean': r.mean, 'sum': r.sum, 'min': r.min, 'max': r.max}[fn]().to_numpy()


def hours_since(cond, cap=240):
    out = np.empty(cond.shape, np.float32); c = np.full(cond.shape[1], float(cap))
    for h in range(cond.shape[0]):
        c = np.where(cond[h], 0.0, np.minimum(c + 1, cap)); out[h] = c
    return out


def base_features_mn(meta, idx, F, Ts, T5):
    nh, ns = Ts.shape
    one = np.ones((nh, 1)); hr = np.array([t.hour for t in idx])
    S = lambda v: one * np.asarray(v, float)[None, :]
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
    # The three replacements (fysik/README.md): ECMWF snow depth → the column's own snowpack; soil 0–7 cm → the column's
    # 5.5 cm layer; low cloud → effective sky emissivity from the measured longwave (Brutsaert-filled in the spin-up).
    feat['snowd'] = F['swe']
    feat['soil0'] = T5
    eps = F['lw'] / (SIGMA * (F['ta'] + 273.15) ** 4)
    feat['cloudlow'] = pd.DataFrame(np.clip(eps, 0.3, 1.2)).ffill().bfill().to_numpy()
    feat['cloudlow6'] = roll(feat['cloudlow'], 6)
    DD = common.D
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


def state_features_mn(feat, F, Ts):
    feat['swe'] = F['swe']
    feat['ts_min24'] = roll(Ts, 24, 'min'); feat['ts_max24'] = roll(Ts, 24, 'max')
    feat['ts_min72'] = roll(Ts, 72, 'min'); feat['ts_max72'] = roll(Ts, 72, 'max')
    feat['ta_min24'] = roll(F['ta'], 24, 'min'); feat['ta_max72'] = roll(F['ta'], 72, 'max')
    feat['fdh72'] = roll(np.minimum(F['ta'], 0), 72, 'sum')
    feat['tdh72'] = roll(np.maximum(F['ta'], 0), 72, 'sum')
    feat['h_since_thaw'] = hours_since(Ts > 0.5)
    feat['h_since_frost'] = hours_since(Ts < -0.5)
    feat['h_since_precip'] = hours_since(F['precip'] > 0.1)
    feat['h_since_snow'] = hours_since(F['snowfall'] > 0.1)
    feat['sn168'] = roll(F['snowfall'], 168, 'sum'); feat['pr72'] = roll(F['precip'], 72, 'sum')
    feat['rain_on_frozen'] = (F['precip'] > 0.1) * (F['ta'] < 1) * (F['snowfall'] < 0.05)
    feat['snowd_x_cold'] = feat['snowd'] * (feat['ta72'] < -1)                   # replacement: swe instead of snow depth
    feat['sw_x_snowd'] = feat['sw'] * (feat['snowd'] > SNO_TACKE_MM)             # replacement: 2 mm water ≈ 0.02 m snow
    feat['clear_calm_night'] = (1 - F['cloud']) / np.maximum(F['wind'], 1) * (F['sw'] < 5)
    return {k: np.asarray(v, np.float32) for k, v in feat.items()}


def gather(feat, names, cols, rows=None):
    if rows is None:
        return np.stack([np.asarray(feat[k][:, cols], np.float32).reshape(-1) for k in names], -1)
    return np.stack([np.asarray(feat[k][:, cols], np.float32).reshape(-1)[rows] for k in names], -1)


def fit_oof(feat, names, obs, Ts, fold, max_rows=1_400_000, iters=700, lr=0.06, leaves=63, msl=300, l2=1.0, seed=0):
    """v4.py's fit_oof: every station predicted with its whole region (fold) held out."""
    nh = Ts.shape[0]
    y = obs - Ts
    pred = np.full_like(Ts, np.nan); rng = np.random.default_rng(seed)
    for f in range(5):
        trs = np.where(fold != f)[0]; tes = np.where(fold == f)[0]
        yt = y[:, trs].reshape(-1); ot = obs[:, trs].reshape(-1)
        sel = np.where(np.isfinite(yt) & (ot <= 10))[0]
        if len(sel) > max_rows: sel = rng.choice(sel, max_rows, replace=False)
        Xt = gather(feat, names, trs, sel)
        m = HistGradientBoostingRegressor(max_iter=iters, learning_rate=lr, max_leaf_nodes=leaves,
                                          min_samples_leaf=msl, l2_regularization=l2, random_state=seed)
        m.fit(Xt, yt[sel]); del Xt
        pred[:, tes] = Ts[:, tes] + m.predict(gather(feat, names, tes)).reshape(nh, len(tes))
        logg(f"  veck {f} klart")
    return pred


# ── Output in the FYSIK file's format (utdata_fysik.py): hourly values, half-hours as the mean of the two surrounding hours.
def utdata(P, idx, meta, ut):
    hours = pd.DatetimeIndex(idx)
    start = max(hours[0], pd.Timestamp(VINTER_START))
    half = pd.date_range(start, hours[-1], freq='30min')
    df = pd.DataFrame(P, index=hours, columns=meta.sid)
    on_hour = df.reindex(half)
    prev = df.reindex(half.floor('h')); prev.index = half
    nxt = df.reindex(half.ceil('h')); nxt.index = half
    mid = (prev + nxt) / 2
    cond = np.broadcast_to(np.asarray(half.minute == 0)[:, None], on_hour.shape)
    out = pd.DataFrame(np.where(cond, on_hour.to_numpy(), mid.to_numpy()), index=half, columns=meta.sid)
    long = out.stack(future_stack=True).rename('fysik_c').reset_index()
    long.columns = ['t_utc', 'station_id', 'fysik_c']
    long = long.dropna(subset=['fysik_c'])
    long['t_utc'] = long.t_utc.dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    long['fysik_c'] = long.fysik_c.round(2)
    long = long[['station_id', 't_utc', 'fysik_c']].sort_values(['station_id', 't_utc'])
    with gzip.open(ut, 'wt', compresslevel=6, newline='') as fh:      # '\n' on every platform, as utdata_fysik.py wrote on Linux
        long.to_csv(fh, index=False, lineterminator='\n')
    sha = hashlib.sha256(open(ut, 'rb').read()).hexdigest()
    return len(long), sha


def rapport(namn, obs, pred, lat):
    g = gates(obs, pred)
    n = np.zeros_like(obs, bool); n[:, lat >= 62] = True
    gn, gs = gates(obs, pred, n), gates(obs, pred, ~n)
    logg(f"  {namn}: n {g['n']} · A1 {g['A1']:.3f} °C · A2 {100 * g['A2']:.2f} % · A3 {100 * g['A3']:.2f} % · norr {100 * gn['A2']:.2f} % · söder {100 * gs['A2']:.2f} %  (timvis, kedjans egen population)")


def kontroll(ut):
    import v4                                   # the frozen chain: loads data/, runs the frozen physics, defines the folds
    logg(f"kontroll: {len(v4.meta)} stationer, {v4.nh} timmar, Ts ur den frysta params_v2.json")
    feat = v4.state_features(v4.base_features())
    names = list(feat)
    oof = v4.fit_oof(feat, names, **A2_KONFIG)
    np.save(f'{ut}/oof_A2_kontroll.npy', oof)
    sha = hashlib.sha256(open(f'{ut}/oof_A2_kontroll.npy', 'rb').read()).hexdigest()
    logg(f"oof_A2 omräknad: sha256 {sha} — den frysta är 9268c6c7… ({'LIKA' if sha.startswith('9268c6c7') else 'inte byte för byte lika; talen avgör'})")
    rapport('kontroll fysik ensam', v4.obs, v4.Ts, v4.lat)
    rapport('kontroll fysik + rättelse', v4.obs, oof, v4.lat)
    for namn, P in [('kontroll-ts', v4.Ts), ('kontroll-fysik', oof)]:
        rader, s = utdata(P, v4.idx, v4.meta, f'{ut}/{namn}-2024-25.csv.gz')
        logg(f"{namn}-2024-25.csv.gz: {rader} rader, sha256 {s}")


def niva2(fil, ut, maxfev):
    from metnordic import load_mn
    meta, idx, F, obs, aux, t0 = load_mn(fil)
    lat = meta.lat.to_numpy()
    logg(f"nivå 2: {len(meta)} stationer, {len(idx)} timmar, MET Nordic från {t0} (dessförinnan ECMWF som uppvärmning)")
    fold = veck(meta)
    bas = json.load(open('params_v2.json'))
    p, k = kalibrera(F, obs, fold, bas, maxfev)
    logg(f"kalibrering klar efter {k['evals']} utvärderingar: träning A1 {k['train']['A1']:.3f} A2 {100 * k['train']['A2']:.2f} % · "
         f"andra halvan A1 {k['test']['A1']:.3f} A2 {100 * k['test']['A2']:.2f} % (med de frysta parametrarna {100 * k['test_start']['A2']:.2f} %)")
    json.dump(p, open(f'{ut}/params_mn.json', 'w'))
    logg("params_mn.json: " + json.dumps({kk: round(float(v), 5) for kk, v in p.items()}))
    Ts, T5 = run_lw(F, p)
    feat = state_features_mn(base_features_mn(meta, idx, F, Ts, T5), F, Ts)
    names = list(feat)
    logg(f"{len(names)} särdrag")
    oof = fit_oof(feat, names, obs, Ts, fold, **A2_KONFIG)
    rapport('nivå 2 fysik ensam', obs, Ts, lat)
    rapport('nivå 2 fysik + rättelse', obs, oof, lat)
    for namn, P in [('niva2-ts', Ts), ('niva2-fysik', oof)]:
        rader, s = utdata(P, idx, meta, f'{ut}/{namn}-2024-25.csv.gz')
        logg(f"{namn}-2024-25.csv.gz: {rader} rader, sha256 {s}")


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('lage', choices=['kontroll', 'niva2'])
    ap.add_argument('--ut', required=True)
    ap.add_argument('--metnordic')
    ap.add_argument('--maxfev', type=int, default=120)
    a = ap.parse_args()
    os.makedirs(a.ut, exist_ok=True)
    if a.lage == 'kontroll':
        kontroll(a.ut)
    else:
        if not a.metnordic: sys.exit('--metnordic <fil> krävs')
        niva2(a.metnordic, a.ut, a.maxfev)
    logg('klart')
