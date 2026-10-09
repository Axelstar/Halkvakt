"""Per-station fingerprint file for Bengt (bedömningen §4.2): station id, fingerprint in °C, number of hours, model and population.

Fingerprint = mean(measured surface − model) per station. Positive = the road runs warmer than the model says.
Population = hourly VViS points (:00 UTC), measured surface ≤ +5 °C, after prep.py's guards (#75 givarvakt luft−yta > 12,
radvakt luft ≥ 10 & luft−yta ≥ 8, |yta| ≤ 45), model value present. Stations with < 20 hours get no fingerprint.
Two models, two periods:
  A2   = oof_A2.npy  — physics + learned correction, target region held out (KMeans 25 % 5), the 10.2 % model (frozen 7/10, sha 9268c6c7…)
  Bsp  = B_sp.npy    — the earlier physics + learned correction without road/terrain features (final.py), the model behind the 23 % R²
  vinter = all hours Nov 2024–Mar 2025; novdec = Nov–Dec only (the learning window used in roadtest.py)
Also re-runs the road-data R² test (roadtest.py) on both models so the 23 % is reproduced in a log, not quoted from memory."""
import numpy as np, pandas as pd, hashlib, json
from sklearn.linear_model import RidgeCV
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import make_column_transformer
from sklearn.pipeline import make_pipeline
from sklearn.cluster import KMeans
from common import load, gates

meta, idx, F, obs, aux = load()
mon = np.array([t.month for t in idx])
models = {'A2': np.load('oof_A2.npy'), 'Bsp': np.load('B_sp.npy')}
periods = {'vinter': np.ones(len(idx), bool), 'novdec': (mon == 11) | (mon == 12)}
rows = []
for mn, P in models.items():
    res = obs - P
    for pn, pm in periods.items():
        r = np.where(pm[:, None] & np.isfinite(res) & (obs <= 5), res, np.nan)
        n = np.isfinite(r).sum(0)
        with np.errstate(all='ignore'):
            mu = np.nanmean(r, 0); sd = np.nanstd(r, 0)
        for j, s in enumerate(meta.sid):
            rows.append(dict(sid=s, lon=round(meta.lon[j], 5), lat=round(meta.lat[j], 5), modell=mn, period=pn,
                             population='yta<=+5C, timvis, vakter #75/#234 (prep.py)', n_timmar=int(n[j]),
                             fingeravtryck_c=(round(float(mu[j]), 3) if n[j] >= 20 else None),
                             sd_c=(round(float(sd[j]), 3) if n[j] >= 20 else None)))
out = pd.DataFrame(rows)
out.to_csv('fingeravtryck-2024-25.csv', index=False)
print('rows', len(out), 'stations', out.sid.nunique())
for (mn, pn), g in out.groupby(['modell', 'period']):
    f = g.fingeravtryck_c.dropna()
    print(f'{mn:4s} {pn:7s} stations with fingerprint {len(f):4d}  mean {f.mean():+.2f}  sd {f.std():.2f}  10-90% {f.quantile(.1):+.2f}..{f.quantile(.9):+.2f}  median hours {int(g.n_timmar.median())}')
print('sha256 fingeravtryck-2024-25.csv', hashlib.sha256(open('fingeravtryck-2024-25.csv', 'rb').read()).hexdigest())

# --- road-data R² (roadtest.py, verbatim protocol) on both models ---
R = pd.read_csv('data/road_mitt.csv', dtype={'sid': str}).drop_duplicates('sid').set_index('sid')
sel = meta.sid.isin(R.index).to_numpy()
m2 = meta[sel].reset_index(drop=True)
km = KMeans(n_clusters=15, n_init=4, random_state=0).fit(m2[['lon', 'lat']].to_numpy() * [0.55, 1]); fold = km.labels_ % 5
num = ['adt_log', 'heavy_share']; cat = ['Vagunderhallsklass_Vagunderhallsklass', 'FunkVagklass_Klass', 'Driftomrade_Entreprenor']
for mn, P in models.items():
    res = obs - P
    def fp(m):
        r = np.where(m & np.isfinite(res) & (obs <= 5), res, np.nan); n = np.isfinite(r).sum(0)
        with np.errstate(all='ignore'):
            return np.where(n >= 20, np.nanmean(r, 0), np.nan)
    f_learn = fp(((mon == 11) | (mon == 12))[:, None])
    d = R.loc[meta.sid[sel]].copy(); d['f'] = f_learn[sel]
    d['adt_log'] = np.log10(d.Trafik_Adt_samtliga_fordon.clip(lower=10)); d['heavy_share'] = d.Trafik_Adt_tunga_fordon / d.Trafik_Adt_samtliga_fordon
    X = d[num + cat].copy(); X[cat] = X[cat].astype(str)
    y = d.f.to_numpy(); ok = np.isfinite(y); p = np.full(len(y), np.nan)
    for k in range(5):
        tr = (fold != k) & ok; te = fold == k
        mdl = make_pipeline(make_column_transformer((StandardScaler(), num), (OneHotEncoder(handle_unknown='ignore'), cat)), RidgeCV(alphas=np.logspace(-1, 3, 20)))
        mdl.fit(X[tr], y[tr]); p[te] = mdl.predict(X[te])
    r2 = 1 - np.nansum((y - p) ** 2) / np.nansum((y[ok] - y[ok].mean()) ** 2)
    test = np.zeros_like(obs, bool); test[:, np.where(sel)[0]] = ((mon >= 1) & (mon <= 3))[:, None]
    Pp = P.copy(); Pp[:, np.where(sel)[0]] += np.nan_to_num(p)[None, :]
    Po = P.copy(); Po[:, np.where(sel)[0]] += np.nan_to_num(y)[None, :]
    print(f'{mn}: {len(d)} middle-region stations, Nov–Dec fingerprint sd {np.nanstd(y):.2f} °C; held-out regions R² from road data = {r2:.3f}, corr {np.corrcoef(y[ok], p[ok])[0,1]:.2f}; '
          f'Jan–Mar gross errors: model {100*gates(obs,P,test)["A2"]:.1f}% | + road-predicted fingerprint {100*gates(obs,Pp,test)["A2"]:.1f}% | + measured Nov–Dec fingerprint {100*gates(obs,Po,test)["A2"]:.1f}%')
