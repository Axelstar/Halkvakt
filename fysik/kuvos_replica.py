"""Physics-first judged by kuvösen's rules, outside the repo. Rules copied from publish/grind-a.ts, publish/snapshot-core.ts,
sql/030 and publish/frysflagga.ts (see FRYS-2026-10-07.md). No parameter in this file may change after the first run."""
import json, sys, math
import numpy as np, pandas as pd

D = '/home/claude/fys'
BUCKET_S = 1800; K_NEIGHBOURS = 5; MAX_KM = 50.0; MIN_SHARED = 20
A1_MAX, A2_MAX, A3_MAX = 1.0, 0.05, 0.10; MIN_POINTS, MIN_STATIONS = 500, 20; Z = 1.96
FRYS_C = 1.0; K2 = [0.0, 0.5, 1.0]
GIVARFEL_LUFT_MIN_C, GIVARFEL_GAP_C, KARANTAN_DYGN, KARANTAN_BROTT = 10.0, 8.0, 7, 3
L_RES, K_RES, RMAX_RES, SHRINK = 100.0, 8, 300.0, 0.5          # FYSIK+GRANNAR
L_BLEND, W_BLEND = 80.0, 0.5                                    # FYSIK+BLANDNING
out = {}


def say(s):
    print(s, flush=True)


# ---------------------------------------------------------------- observations, guards (grind A's WHERE)
obs = pd.read_parquet(f'{D}/data/vvis_30min_raw.parquet')[['sid', 't', 'tyta', 'tluft']].copy()
obs['tyta'] = obs.tyta.astype(float); obs['tluft'] = obs.tluft.astype(float)
obs = obs[obs.tyta.between(-60, 60) | obs.tyta.isna()]   # the kuvös translation nulls only the sentinels; ±50 sensor junk stays for the guards to catch
obs = obs.dropna(subset=['tyta'])
obs = obs.sort_values(['sid', 't'])
air, sfc = obs.tluft.to_numpy(), obs.tyta.to_numpy()
g75 = np.isfinite(air) & (sfc >= air - 12)
radvakt = (~np.isfinite(air)) | (air < GIVARFEL_LUFT_MIN_C) | ((air - sfc) < GIVARFEL_GAP_C)
# karantän: breaches (surface < air - 12) in the 7 days up to and including the row, per station
obs['brott'] = (np.isfinite(air) & (sfc < air - 12)).astype(int)
def rolling_breaches(g):
    s = pd.Series(g.brott.to_numpy(), index=g.t)
    return s.rolling(pd.Timedelta(days=KARANTAN_DYGN), closed='both').sum().to_numpy()
obs['brott7'] = np.concatenate([rolling_breaches(g) for _, g in obs.groupby('sid', sort=False)])
karantan = obs.brott7.to_numpy() < KARANTAN_BROTT
# långsamma vakten (sql/030): a station-UTC-day is 'in fault' if any row that day has >=24 readings in the trailing 24 h with >=90 % air-surface>=6
obs['stort'] = (np.isfinite(air) & ((air - sfc) >= 6)).astype(float)
obs['has_air'] = np.isfinite(air).astype(float)
def slow(g):
    s = pd.Series(g.stort.to_numpy(), index=g.t); h = pd.Series(g.has_air.to_numpy(), index=g.t)
    n24 = h.rolling(pd.Timedelta(hours=24), closed='both').sum().to_numpy()
    st24 = s.rolling(pd.Timedelta(hours=24), closed='both').sum().to_numpy()
    return (n24 >= 24) & (st24 >= 0.9 * n24)
obs['infault'] = np.concatenate([slow(g) for _, g in obs.groupby('sid', sort=False)])
obs['day'] = obs.t.dt.floor('D')
faultdays = obs.loc[obs.infault, ['sid', 'day']].drop_duplicates()
obs = obs.merge(faultdays.assign(fd=1), on=['sid', 'day'], how='left')
langsam_ok = obs.fd.isna().to_numpy()
keep = g75 & radvakt & karantan & langsam_ok
out['vakterna'] = {'rader_med_yta': int(len(obs)), 'efter_#75': int(g75.sum()), 'efter_radvakt': int((g75 & radvakt).sum()),
                   'efter_karantan': int((g75 & radvakt & karantan).sum()), 'efter_langsam': int(keep.sum()),
                   'stationsdygn_i_felet': int(len(faultdays))}
say(f"vakterna: {out['vakterna']}")
obs = obs[keep].copy()
obs['b'] = (obs.t.astype('datetime64[s]').astype('int64')) // BUCKET_S          # seconds since epoch, explicit unit
obs = obs.sort_values(['sid', 'b', 't']).drop_duplicates(['sid', 'b'], keep='last')   # latest per (station, bucket)
meta = pd.read_csv(f'{D}/data/stations.csv', dtype={'sid': str})
obs = obs[obs.sid.isin(meta.sid)]
sids = sorted(obs.sid.unique(), key=int); sidx = {s: i for i, s in enumerate(sids)}
b0, b1 = int(obs.b.min()), int(obs.b.max()); nb = b1 - b0 + 1
M = np.full((nb, len(sids)), np.nan, np.float32)
M[obs.b.to_numpy() - b0, obs.sid.map(sidx).to_numpy()] = obs.tyta.to_numpy(np.float32)
lon = meta.set_index('sid').lon.loc[sids].to_numpy(); lat = meta.set_index('sid').lat.loc[sids].to_numpy()
say(f'{len(sids)} stationer, {np.isfinite(M).sum()} bucketade avläsningar, {nb} halvtimmar')


def hav(lo1, la1, lo2, la2):
    R = 6371.0; p1, p2 = np.radians(la1), np.radians(la2)
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(np.radians(lo2 - lo1) / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))


Dm = hav(lon[:, None], lat[:, None], lon[None, :], lat[None, :])
fin = np.isfinite(M); M0 = np.where(fin, M, 0.0)

# ---------------------------------------------------------------- RÅ, exactly grind-a.ts evaluate(utanOffset)
RA = np.full_like(M, np.nan); ANK = np.full_like(M, np.nan)
for j in range(len(sids)):
    d = Dm[j].copy(); d[j] = np.inf
    cand = np.where(d <= MAX_KM)[0]
    cand = cand[np.argsort(d[cand])][:K_NEIGHBOURS]
    if cand.size == 0: continue
    shared = (fin[:, [j]] & fin[:, cand]).sum(0)                # shared buckets per pair
    usable = cand[(shared - 1) >= MIN_SHARED]                   # minus the evaluated bucket itself
    if usable.size == 0: continue
    dd = d[usable]; w = 1.0 / np.maximum(dd, 1.0)
    use = fin[:, usable] & fin[:, [j]]
    W = use * w[None, :]; ws = W.sum(1); ok = ws > 0
    RA[ok, j] = (W * M0[:, usable]).sum(1)[ok] / ws[ok]
    first = np.argmax(use, axis=1); ANK[ok, j] = dd[first[ok]]

# ---------------------------------------------------------------- FYSIK: hourly OOF predictions -> half-hour buckets
p_h = np.load(f'{D}/oof_A2.npy')                               # (n_hours, 754) hourly, UTC, idx from common.load
import importlib.util, sys as _s; _s.path.insert(0, D)
from common import load as _load
meta_h, idx_h, _F, _obs, _aux = _load()
col_h = {s: i for i, s in enumerate(meta_h.sid)}
hb = (idx_h.values.astype('datetime64[s]').astype('int64')) // BUCKET_S   # seconds since epoch, explicit unit
PH = np.full_like(M, np.nan)
hour_rows = hb - b0
good = (hour_rows >= 0) & (hour_rows < nb)
cols = np.array([col_h.get(s, -1) for s in sids])
for k, s in enumerate(sids):
    if cols[k] < 0: continue
    ph = p_h[:, cols[k]]
    PH[hour_rows[good], k] = ph[good]
    # half-hour = mean of neighbouring hours
    mid = hour_rows[good][:-1] + 1
    v = 0.5 * (ph[good][:-1] + ph[good][1:])
    m2 = (mid < nb) & (np.diff(hour_rows[good]) == 2)
    PH[mid[m2], k] = v[m2]

# ---------------------------------------------------------------- FYSIK+GRANNAR: neighbours' residuals against FYSIK
res = M - PH; rfin = np.isfinite(res); r0 = np.where(rfin, res, 0.0)
CORR = np.zeros_like(M)
for j in range(len(sids)):
    d = Dm[j].copy(); d[j] = np.inf
    cand = np.where(d <= RMAX_RES)[0]
    cand = cand[np.argsort(d[cand])][:K_RES * 4]
    if cand.size == 0: continue
    dd = d[cand]; w = np.exp(-dd / L_RES)
    f = rfin[:, cand]; rank = np.cumsum(f, axis=1); use = f & (rank <= K_RES)
    W = use * w[None, :]; ws = W.sum(1); ok = ws > 0
    CORR[ok, j] = (W * r0[:, cand]).sum(1)[ok] / (ws[ok] + SHRINK)
PG = PH + CORR
wb = W_BLEND * np.exp(-np.nan_to_num(ANK, nan=1e9) / L_BLEND)
PB = np.where(np.isfinite(RA), wb * RA + (1 - wb) * PG, PG)

# ---------------------------------------------------------------- measures, exactly grind A + frysflagga
BANDS = [('0–7 km', 0, 7), ('7–15 km', 7, 15), ('15–20 km', 15, 20), ('>20 km', 20, np.inf)]
north = lat >= 62


def stats(meas, pred):
    m = np.isfinite(meas) & np.isfinite(pred) & (meas <= 5)
    me, pr = meas[m], pred[m]; n = int(me.size)
    if n == 0: return dict(n=0)
    dec = me >= -5; err = pr - me; ad = np.abs(err[dec])
    gross = float((np.abs(err) > 2).mean()); freeze = float((((me < 0) & (pr > 2)) | ((me > 2) & (pr < 0))).mean())
    mae = float(ad.mean()) if dec.any() else float('nan')
    maeSe = float(ad.std(ddof=1) / math.sqrt(ad.size)) if ad.size > 1 else float('nan')
    se = lambda p: math.sqrt(p * (1 - p) / n)
    return dict(n=n, nDec=int(dec.sum()), mae=mae, maeSe=maeSe, gross=gross, grossSe=se(gross), freeze=freeze, freezeSe=se(freeze))


def verdict(v, thr, se, nog):
    if not nog or not np.isfinite(se): return '—'
    if abs(v - thr) <= Z * se: return 'OAVGJORT'
    return 'KLARAR' if v <= thr else 'FALLER'


def flaggtal(meas, est, st, k2, k1=FRYS_C):
    m = np.isfinite(meas) & np.isfinite(est) & (meas <= 5)
    me, es = meas[m], est[m]
    fryser = me <= k1; saFryser = es <= k1 - k2; saInte = es > k1 + k2
    uttalar = saFryser | saInte
    return dict(n=int(me.size), stationer=int(len(np.unique(st[m]))), frys=int(fryser.sum()), uttalar=int(uttalar.sum()),
                rattKlass=int((uttalar & (saFryser == fryser)).sum()), farligaFel=int((fryser & saInte).sum()),
                flaggor=int((~saInte).sum()), falskaFlaggor=int(((~saInte) & (~fryser)).sum()),
                klartFalska=int(((~saInte) & (~fryser) & (me > k1 + 1)).sum()))


def pct(x, n): return f'{100 * x / n:.1f} %'.replace('.', ',') if n else '–'


ST = np.broadcast_to(np.arange(len(sids))[None, :], M.shape)
cands = [('RÅ', RA, ANK), ('FYSIK', PH, ANK), ('FYSIK+GRANNAR', PG, ANK), ('FYSIK+BLANDNING', PB, ANK)]
for namn, P, A in cands:
    say(f'\n=== {namn} ===')
    rows = {}
    for bn, lo, hi in BANDS:
        bm = (A > lo) & (A <= hi)
        s = stats(np.where(bm, M, np.nan), P); rows[bn] = s
        if s['n']: say(f"  {bn:9s} n {s['n']:8d}  MAE {s['mae']:.2f} °C  grova {100*s['gross']:.1f} %  frysklass {100*s['freeze']:.1f} %")
    tot = stats(np.where(np.isfinite(A), M, np.nan), P)
    if tot['n'] == 0:
        say('  INGA PUNKTER — kandidaten saknar värden på populationen'); out[namn] = {'n': 0}; continue
    nog = tot['n'] >= MIN_POINTS and len(np.unique(ST[np.isfinite(A) & np.isfinite(M) & np.isfinite(P) & (M <= 5)])) >= MIN_STATIONS
    say(f"  TOTALT (med ankare) n {tot['n']}  A1 {tot['mae']:.2f} °C [±{Z*tot['maeSe']:.2f}] → {verdict(tot['mae'], A1_MAX, tot['maeSe'], nog)}"
        f"  A2 {100*tot['gross']:.2f} % [±{100*Z*tot['grossSe']:.2f}] → {verdict(tot['gross'], A2_MAX, tot['grossSe'], nog)}"
        f"  A3 {100*tot['freeze']:.2f} % [±{100*Z*tot['freezeSe']:.2f}] → {verdict(tot['freeze'], A3_MAX, tot['freezeSe'], nog)}")
    alla = stats(M, P)
    nrt = stats(np.where(north[None, :], M, np.nan), P); sth = stats(np.where(~north[None, :], M, np.nan), P)
    say(f"  ALLA hinkar yta ≤ 5 (utan krav på ankare) n {alla['n']}  A1 {alla['mae']:.2f}  A2 {100*alla['gross']:.2f} %  A3 {100*alla['freeze']:.2f} %"
        f"  | norr om 62° A2 {100*nrt['gross']:.2f} %  söder A2 {100*sth['gross']:.2f} %")
    ff = {}
    for k2 in K2:
        t = flaggtal(np.where(np.isfinite(A), M, np.nan), P, ST, k2)
        say(f"  frysflaggan K2 {k2}: farliga fel {pct(t['farligaFel'], t['frys'])} av frysningarna · falska flaggor {pct(t['falskaFlaggor'], t['flaggor'])}"
            f" · rätt klass {pct(t['rattKlass'], t['uttalar'])} · täckning {pct(t['uttalar'], t['n'])}  (n {t['n']}, frys {t['frys']})")
        ff[str(k2)] = t
    out[namn] = {'band': rows, 'totalt': tot, 'alla': alla, 'norr': nrt, 'soder': sth, 'frysflaggan': ff,
                 'dom': {'A1': verdict(tot['mae'], A1_MAX, tot['maeSe'], nog), 'A2': verdict(tot['gross'], A2_MAX, tot['grossSe'], nog),
                         'A3': verdict(tot['freeze'], A3_MAX, tot['freezeSe'], nog)}}
json.dump(out, open(f'{D}/results_replica.json', 'w'), indent=1, default=float)
say('\nDONE')
