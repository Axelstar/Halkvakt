"""Nivå 2 in the forecast mode on MET Nordic's own forecasts (kort #308, DECISIONS #518, #519).

  cd /home/claude/fys && python3 niva2/prognos.py --metnordic <analysis.csv.gz> --prognos '<dir>/metnordic_prognos_*.csv.gz' --ut <dir>

What it does, as #519 registered it:
  1. Nivå 2 on the analysis exactly as kedja.py niva2 (the same calibration protocol, features and correction configuration).
     The physics column's full state is saved at the end of the hour before every forecast run starts.
  2. Restart (B): for each of the winter's runs (00, 06, 12, 18 UTC) the column starts from that saved state and runs forward on
     the run's forecast to +29 h. The features for the forecast hours are built on a window where the hours before the run are the
     analysis and the hours from the run on are the forecast (the 72-hour and 45-day windows included); the snowpack continues from
     the analysis' at the run's start. The correction learned on the analysis (one model per fold, the station's own region held
     out) is applied to those features — it is never refitted on forecasts.
  3. Lead classes: +6 h (steps 6–11) and +24 h (steps 24–29). Each hour gets the latest run whose lead is in the class; an hour whose
     run is missing in the archive stays empty.
Out (in --ut, never outside the job): oof_niva2.npy (the analysis, the control against #517) and oof_prognos6.npy, oof_prognos24.npy,
the same shape (the chain's hours × stations). fysik/blandning/grannar_blandning.py runs Axel's frozen replica on each; the
neighbours' measured errors and RÅ are taken at the valid time, as #490's operational mode says.

Forecast file (kuvos/metnordic-prognos.ts): station_id,korning_utc,ledtid_h,tid_utc + the analysis' seven fields. Two differences
from the analysis file: radiation and precipitation are empty at step 0 — they take the analysis' value for that hour, which in
operation is published a quarter of an hour after the hour (#519 point 4); precipitation has small negative values — in
[−0.01, 0) they count as 0 and are counted; below −0.01 mm the run stops (#519 point 3).
"""
import argparse, glob, json, os, sys, time
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.dirname(HERE)]
from kedja import veck, kalibrera, base_features_mn, state_features_mn, gather, rapport, logg, A2_KONFIG
from fysik_lw import run_lw
from metnordic import magnus_td, SNO_T_C, CM_PER_MM

FALT = ["t2m_c", "rh2m", "vind10_ms", "moln", "nederbord_mm", "langvag_jm2", "kortvag_jm2"]
TIMSTEG = 30
LEDTIDER = {6: range(6, 12), 24: range(24, 30)}
FONSTER = 24 * 45            # the longest window behind a feature or the physics' deep boundary (tdeep, 45 days)
NED_BRUS = -0.01             # precipitation in [NED_BRUS, 0) is noise and counts as 0 (#519 point 3)
DYGNSVARDEN = ('ta', 'td', 'wind', 'cloud', 'sw', 'lw', 'precip', 'snowfall')


def fit_modeller(feat, names, obs, Ts, fold, max_rows=1_400_000, iters=700, lr=0.06, leaves=63, msl=300, l2=1.0, seed=0):
    """kedja.fit_oof line for line (the same sampling, the same random numbers, the same out-of-fold estimate), and it also
    returns the five models, so the correction learned on the analysis can be applied to the forecast hours."""
    nh = Ts.shape[0]
    y = obs - Ts
    pred = np.full_like(Ts, np.nan); rng = np.random.default_rng(seed); modeller = []
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
        modeller.append(m)
        logg(f"  veck {f} klart")
    return pred, modeller


def las_prognos(filer, sids):
    """The forecast files → runs (sorted, naive UTC) and {field: (n_runs, 30, n_st) float32}, NaN where empty."""
    if not filer:
        raise ValueError("inga prognosfiler")
    delar = []
    for f in sorted(filer):
        d = pd.read_csv(f, usecols=['station_id', 'korning_utc', 'ledtid_h'] + FALT,
                        dtype={'station_id': str, 'korning_utc': str, 'ledtid_h': np.int16, **{k: np.float32 for k in FALT}})
        logg(f"  {os.path.basename(f)}: {len(d)} rader")
        delar.append(d)
    d = pd.concat(delar, ignore_index=True); del delar
    col = {s: i for i, s in enumerate(sids)}
    d['s'] = d.station_id.map(col)
    okanda = int(d.s.isna().sum())
    d = d[d.s.notna()]
    namn = sorted(d.korning_utc.unique())
    korningar = pd.DatetimeIndex(pd.to_datetime(namn, utc=True)).tz_convert(None)
    kix = {k: i for i, k in enumerate(namn)}
    r = d.korning_utc.map(kix).to_numpy(); l = d.ledtid_h.to_numpy(); s = d.s.to_numpy(int)
    if l.min() < 0 or l.max() >= TIMSTEG:
        raise ValueError(f"ledtid utanför 0–{TIMSTEG - 1}: {l.min()}–{l.max()}")
    A = {}
    for k in FALT:
        a = np.full((len(korningar), TIMSTEG, len(sids)), np.nan, np.float32)
        a[r, l, s] = d[k].to_numpy(np.float32)
        A[k] = a
    logg(f"prognosen: {len(korningar)} körningar {korningar[0]}–{korningar[-1]}, {len(d)} rader, {okanda} rader från stationer utanför kedjan")
    return korningar, A


def vader(A):
    """The forecast in the chain's units, as metnordic.load_mn converts the analysis. Returns {key: (n_runs, 30, n_st)} and counts."""
    ta, rh, wind, cloud, precip, lw, sw = (A[k].astype(float) for k in FALT)
    under = np.isfinite(precip) & (precip < NED_BRUS)
    if under.any():
        raise ValueError(f"nederbörd under {NED_BRUS} mm i prognosen: {int(under.sum())} värden, lägst {np.nanmin(precip):.4f} — läsningen fälls (#519)")
    brus = np.isfinite(precip) & (precip < 0)
    precip = np.where(brus, 0.0, precip)
    sw = np.maximum(sw / 3600.0, 0.0)
    lw = lw / 3600.0
    td = np.minimum(magnus_td(ta, rh), ta)
    snowfall = CM_PER_MM * precip * (ta <= SNO_T_C)
    return dict(ta=ta, td=td, wind=wind, cloud=cloud, sw=sw, lw=lw, precip=precip, snowfall=snowfall), int(brus.sum())


def skarv(F, hk, a, V, r, swe_fore):
    """The weather for the window [a, hk + 30): the analysis before the run, the forecast from it (empty forecast values — step 0's
    radiation and precipitation — take the analysis'); tdeep, ta72 and the snowpack recomputed on the joined series."""
    nh = F['ta'].shape[0]
    b = min(hk + TIMSTEG, nh); L = b - hk; j = hk - a
    G = {k: (v[a:b].copy() if isinstance(v, np.ndarray) and v.ndim == 2 else v) for k, v in F.items()}
    fyllda = 0
    for k in DYGNSVARDEN:
        prog = V[k][r, :L]
        tom = ~np.isfinite(prog)
        fyllda += int(tom.sum())
        G[k][j:] = np.where(tom, G[k][j:], prog)
    G['snowfall'][j:] = CM_PER_MM * G['precip'][j:] * (G['ta'][j:] <= SNO_T_C)
    taf = pd.DataFrame(G['ta'])
    G['tdeep'] = taf.rolling(FONSTER, min_periods=1).mean().to_numpy()
    G['ta72'] = taf.rolling(72, min_periods=1).mean().to_numpy()
    s = swe_fore.copy()
    for i in range(j, j + L):
        s = np.maximum(s + G['snowfall'][i] * 1.0 - 0.125 * np.maximum(G['ta'][i], 0.0), 0.0)
        G['swe'][i] = s
    return G, j, L, fyllda


def prognoslage(meta, idx, F, Ts, T5, tillstand, p, modeller, fold, names, korningar, V, logga_var=100):
    """The restart for every run, the correction applied to the forecast hours of each lead class. Returns {lead: (nh, ns)} and counts."""
    nh, ns = Ts.shape
    P = {L: np.full((nh, ns), np.nan) for L in LEDTIDER}
    TS = {L: np.full((nh, ns), np.nan) for L in LEDTIDER}
    karta = {t: i for i, t in enumerate(idx)}
    kor = utan = fyllda = 0
    for r, kt in enumerate(korningar):
        hk = karta.get(kt)
        if hk is None or hk == 0 or (hk - 1) not in tillstand:
            utan += 1; continue
        a = max(0, hk - FONSTER)
        G, j, L, f = skarv(F, hk, a, V, r, F['swe'][hk - 1])
        fyllda += f
        Fh = {k: (v[j:] if isinstance(v, np.ndarray) and v.ndim == 2 else v) for k, v in G.items()}
        Tsf, T5f = run_lw(Fh, p, T_init=tillstand[hk - 1])
        Tsw = Ts[a:hk + L].copy(); Tsw[j:] = Tsf
        T5w = T5[a:hk + L].copy(); T5w[j:] = T5f
        feat = state_features_mn(base_features_mn(meta, idx[a:hk + L], G, Tsw, T5w), G, Tsw)
        for ledtid, steg in LEDTIDER.items():
            rader = [j + s for s in steg if s < L]
            if not rader: continue
            tider = [hk + s for s in steg if s < L]
            for fv in range(5):
                cols = np.where(fold == fv)[0]
                X = np.stack([np.asarray(feat[k][rader][:, cols], np.float32).reshape(-1) for k in names], -1)
                P[ledtid][np.ix_(tider, cols)] = Tsf[[s for s in steg if s < L]][:, cols] + modeller[fv].predict(X).reshape(len(rader), len(cols))
            TS[ledtid][tider] = Tsf[[s for s in steg if s < L]]
        kor += 1
        if logga_var and kor % logga_var == 0:
            logg(f"  {kor} körningar omstartade (senast {kt})")
    return P, TS, dict(korningar=kor, utan_tillstand=utan, fyllda_ur_analysen=fyllda)


def kor(mn, prognosfiler, ut, maxfev, konfig=A2_KONFIG):
    from metnordic import load_mn
    meta, idx, F, obs, aux, t0 = load_mn(mn)
    lat = meta.lat.to_numpy()
    logg(f"nivå 2 i prognosläget: {len(meta)} stationer, {len(idx)} timmar, MET Nordics analys från {t0}")
    korningar, A = las_prognos(prognosfiler, list(meta.sid))
    V, brus = vader(A); del A
    logg(f"nederbörd i [{NED_BRUS}, 0) räknad som 0: {brus} värden (#519)")
    fold = veck(meta)
    bas = json.load(open('params_v2.json'))
    p, k = kalibrera(F, obs, fold, bas, maxfev)
    logg(f"kalibrering klar efter {k['evals']} utvärderingar: andra halvan A1 {k['test']['A1']:.3f} A2 {100 * k['test']['A2']:.2f} % "
         f"(med de frysta parametrarna {100 * k['test_start']['A2']:.2f} %)")
    json.dump(p, open(f'{ut}/params_mn.json', 'w'))
    karta = {t: i for i, t in enumerate(idx)}
    spara = sorted({karta[t] - 1 for t in korningar if t in karta and karta[t] > 0})
    Ts, T5, tillstand = run_lw(F, p, spara=spara)
    logg(f"analysens kolumn: tillståndet sparat vid {len(tillstand)} körningars start")
    feat = state_features_mn(base_features_mn(meta, idx, F, Ts, T5), F, Ts)
    names = list(feat)
    oof, modeller = fit_modeller(feat, names, obs, Ts, fold, **konfig)
    del feat
    np.save(f'{ut}/oof_niva2.npy', oof)
    rapport('nivå 2 på analysen (kontrollen)', obs, oof, lat)
    P, TS, n = prognoslage(meta, idx, F, Ts, T5, tillstand, p, modeller, fold, names, korningar, V)
    logg(f"omstarter: {n['korningar']} körningar, {n['utan_tillstand']} utanför kedjans timmar; {n['fyllda_ur_analysen']} tomma prognosvärden "
         f"(timsteg 0:s strålning och nederbörd) tagna ur analysen")
    for ledtid in LEDTIDER:
        tackta = np.isfinite(P[ledtid]).any(axis=1)
        logg(f"+{ledtid} h: {int(tackta.sum())} av {len(idx)} timmar har en körning i klassen (från {idx[np.argmax(tackta)]})")
        np.save(f'{ut}/oof_prognos{ledtid}.npy', P[ledtid])
        rapport(f'nivå 2 fysik ensam, +{ledtid} h', obs, TS[ledtid], lat)
        rapport(f'nivå 2 fysik + rättelse, +{ledtid} h', obs, P[ledtid], lat)
    return P, oof


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
