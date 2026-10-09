import numpy as np, pandas as pd, os

D = '/home/claude/fys/data'


def hav(lon1, lat1, lon2, lat2):
    R = 6371.0
    p1, p2 = np.radians(lat1), np.radians(lat2)
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(np.radians(lon2 - lon1) / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))


def load(sids=None):
    """Return meta, hours index, forcing dict F (n_hours, n_st) and obs matrix (n_hours, n_st) for VViS hours."""
    meta = pd.read_csv(f'{D}/stations.csv', dtype={'sid': str})
    if os.path.exists(f'{D}/elev.csv'):
        el = pd.read_csv(f'{D}/elev.csv', dtype={'sid': str})
        meta = meta.merge(el, on='sid', how='left')
    have = [s for s in meta.sid if os.path.exists(f'{D}/ifs/{s}.csv')]
    meta = meta[meta.sid.isin(have)]
    if sids is not None:
        meta = meta[meta.sid.isin(sids)]
    meta = meta.reset_index(drop=True)
    frames = {s: pd.read_csv(f'{D}/ifs/{s}.csv', parse_dates=['time']).set_index('time') for s in meta.sid}
    idx = frames[meta.sid[0]].index
    def M(col):
        return np.column_stack([frames[s][col].reindex(idx).to_numpy(float) for s in meta.sid])
    F = dict(ta=M('temperature_2m'), td=M('dew_point_2m'), wind=M('wind_speed_10m'),
             cloud=M('cloud_cover') / 100.0, sw=M('shortwave_radiation'),
             precip=M('precipitation'), snowfall=M('snowfall'))
    for k in F:
        F[k] = pd.DataFrame(F[k]).ffill().bfill().to_numpy()
    ta = pd.DataFrame(F['ta'])
    F['tdeep'] = ta.rolling(24 * 45, min_periods=1).mean().to_numpy()
    F['ta72'] = ta.rolling(72, min_periods=1).mean().to_numpy()
    # degree-day snowpack on the surrounding ground (mm water): snowfall cm -> ~1 mm/cm, melt 3 mm/degC/day
    swe = np.zeros_like(F['ta']); s = np.zeros(F['ta'].shape[1])
    for h in range(F['ta'].shape[0]):
        s = np.maximum(s + F['snowfall'][h] * 1.0 - 0.125 * np.maximum(F['ta'][h], 0.0), 0.0)
        swe[h] = s
    F['swe'] = swe
    elev_ifs = np.array([frames[s]['elev_ifs'].iloc[0] for s in meta.sid], float)
    if 'elev' in meta:
        F['elev_diff'] = np.nan_to_num(meta.elev.to_numpy(float) - elev_ifs)
    else:
        F['elev_diff'] = np.zeros(len(meta))
    meta['elev_ifs'] = elev_ifs
    # observations
    h = pd.read_parquet(f'{D}/vvis_hourly.parquet')
    h = h[h.sid.isin(meta.sid)]
    obs = h.pivot(index='t', columns='sid', values='tyta').reindex(index=idx, columns=meta.sid)
    aux = {c: h.pivot(index='t', columns='sid', values=c).reindex(index=idx, columns=meta.sid).to_numpy(float)
           for c in ['tluft', 'daggp', 'vimed', 'ned_typ', 'ned_maengd']}
    return meta, idx, F, obs.to_numpy(float), aux


def gates(meas, pred, mask=None):
    """Project yardsticks. Population: measured <= 5 °C. A1 over measured in [-5, 5]."""
    m = np.isfinite(meas) & np.isfinite(pred) & (meas <= 5)
    if mask is not None:
        m &= mask
    me, pr = meas[m], pred[m]
    if me.size == 0:
        return dict(n=0, A1=np.nan, A2=np.nan, A3=np.nan, bias=np.nan)
    dec = me >= -5
    err = pr - me
    return dict(n=int(me.size), A1=float(np.abs(err[dec]).mean()), A2=float((np.abs(err) > 2).mean()),
                A3=float((((me < 0) & (pr > 2)) | ((me > 2) & (pr < 0))).mean()), bias=float(err[dec].mean()))
