"""The candidate live, part A: the physics and the correction at every point from 45 days of MET Nordic analysis and one forecast run
(kort #343 steg 3, DECISIONS #558). Reuses the frozen chain's own code unchanged — fysik_lw.run_lw, kedja's features, prognos.skarv
and prognos.las_prognos/vader — so that the parity test (steg 4) compares the same code on the same inputs.

What the frozen candidate is (DECISIONS #519, #552): for a valid hour t, the surface at a point is the physics column restarted at the
run R issued 6–11 h before t (the +6 h lead class: steps 6–11) on the analysis up to R and the run's forecast from R, plus the correction
model (modell.pkl) on the features at t. The neighbours' measured errors and RÅ at t (the replica, part B) come after, hourly.

Stateless: every run recomputes the analysis column over the window [R − 45 days, R) from scratch (the chain's spin-up, FONSTER), so
no state file can drift. If the runtime demands it, the state at R − 1 can be saved later; the self-test proves the restart equals
a continuous run (fysik_lw's own self-test does too).

  python fysik/live/kandidat_fysik.py --rot <repo> --indata <dir with stations.csv, elev.csv, geofeat.csv, geofeat2.csv, road_all.csv>
         --analys <day files or merged files, analysis form> --korning <forecast file, prognos form> --modell <modell.pkl>
         --kandidat <kuvos/kandidat-2026-27.json> --ut <dir>
  python fysik/live/kandidat_fysik.py --sjalvtest          synthetic data only; runs in ci.yml
"""
import argparse, gzip, hashlib, json, os, pickle, sys, tempfile, time
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
FYS = os.path.dirname(HERE)
sys.path[:0] = [os.path.join(FYS, 'niva2'), FYS]
import common
from fysik_lw import run_lw
from kedja import base_features_mn, state_features_mn, logg
from metnordic import magnus_td, CM_PER_MM, SNO_T_C, FALT
import prognos
from prognos import skarv, las_prognos, vader, FONSTER, TIMSTEG

RUBRIK_ANALYS = ['station_id', 'tid_utc'] + FALT
LEDTID = prognos.LEDTIDER[6] if 6 in prognos.LEDTIDER else list(range(6, 12))      # the +6 h class: steps 6–11
KORNINGAR = (0, 6, 12, 18)
MAX_IFYLLT = 0.01            # the share of (point, hour) cells the analysis may lack before the run refuses (steg 5)


def las_analys(filer, sids):
    """The analysis rows (day files without header, or merged files with it) for the chain's stations → long DataFrame."""
    delar = []
    for f in sorted(filer):
        d = pd.read_csv(f, header=None, names=RUBRIK_ANALYS, dtype={'station_id': str}, na_values=[''], keep_default_na=False)
        d = d[d.station_id != 'station_id']
        for k in FALT: d[k] = pd.to_numeric(d[k], errors='coerce')
        delar.append(d[d.station_id.isin(sids)])
    d = pd.concat(delar, ignore_index=True)
    d['tid_utc'] = pd.to_datetime(d.tid_utc, utc=True).dt.tz_convert(None)
    return d.drop_duplicates(['station_id', 'tid_utc'], keep='last')


def snotacke_fore(d, sids, start):
    """The snowpack (mm water) at the window's first hour, accumulated from the first analysis hour before it with bygg_F's own
    degree-day formula. The column runs 45 days back (FONSTER), but the snowpack has no such bound, and the physics column carries
    none of its own (fysik_lw has no snow state): started at zero it was 20 % low in February against the frozen procedure, which
    accumulates from the archive's first hour (parity 15/10, DECISIONS #559, #562). Missing hours count as no snowfall and carry the
    air forward. Returns (snowpack, hours accumulated, missing point-hours)."""
    fore = d[d.tid_utc < start]
    if fore.empty:
        return np.zeros(len(sids)), 0, 0
    tider = pd.date_range(fore.tid_utc.min(), start - pd.Timedelta(hours=1), freq='h')
    ta = fore.pivot(index='tid_utc', columns='station_id', values='t2m_c').reindex(index=tider, columns=sids)
    pr = fore.pivot(index='tid_utc', columns='station_id', values='nederbord_mm').reindex(index=tider, columns=sids)
    saknade = int(ta.isna().to_numpy().sum())
    ta = ta.ffill().bfill().to_numpy(float); pr = pr.fillna(0.0).to_numpy(float)
    snowfall = CM_PER_MM * pr * (ta <= SNO_T_C)
    s = np.zeros(len(sids))
    for h in range(len(tider)):
        s = np.maximum(s + snowfall[h] * 1.0 - 0.125 * np.maximum(ta[h], 0.0), 0.0)
    return s, len(tider), saknade


def bygg_F(d, sids, idx, sista, swe0=None):
    """The chain's forcing dict on idx (hours), as metnordic.load_mn builds it: missing hours filled forward and back, the radiation
    J/m² → W/m², the dew point by Magnus, snowfall from precipitation at air ≤ +1 °C, tdeep, ta72, the degree-day snowpack, and
    elev_diff 0 (DECISIONS #553, choice i: the 1 km grid stands at the point's own height). Returns F and the number of (point, hour)
    cells that were missing in the analysis up to sista and got filled — the rows after sista are placeholders, not counted."""
    fyllda = 0
    riktiga = np.asarray(idx <= sista)

    def M(f):
        nonlocal fyllda
        m = d.pivot(index='tid_utc', columns='station_id', values=f).reindex(index=idx, columns=sids)
        fyllda = max(fyllda, int(m.isna().to_numpy()[riktiga].sum()))
        return m.ffill().bfill().to_numpy(float)

    ta, rh, wind, cloud, precip, lw, sw = (M(f) for f in FALT)
    sw = np.maximum(sw / 3600.0, 0.0); lw = lw / 3600.0
    td = np.minimum(magnus_td(ta, rh), ta)
    snowfall = CM_PER_MM * precip * (ta <= SNO_T_C)
    F = dict(ta=ta, td=td, wind=wind, cloud=cloud, sw=sw, lw=lw, precip=precip, snowfall=snowfall)
    taf = pd.DataFrame(ta)
    F['tdeep'] = taf.rolling(FONSTER, min_periods=1).mean().to_numpy()
    F['ta72'] = taf.rolling(72, min_periods=1).mean().to_numpy()
    swe = np.zeros_like(ta); s = np.zeros(ta.shape[1]) if swe0 is None else np.asarray(swe0, float).copy()
    for h in range(ta.shape[0]):
        s = np.maximum(s + snowfall[h] * 1.0 - 0.125 * np.maximum(ta[h], 0.0), 0.0); swe[h] = s
    F['swe'] = swe
    F['elev_diff'] = np.zeros(len(sids))
    return F, fyllda


def las_meta(indata):
    """stations.csv + elev.csv (elev, tpi1, tpi3) + elev_ifs.csv if present (else elev_ifs = elev, choice i). Sets common.D so the
    chain's feature builder reads road_all.csv, geofeat.csv and geofeat2.csv from the same directory."""
    meta = pd.read_csv(f'{indata}/stations.csv', dtype={'sid': str})
    meta = meta.merge(pd.read_csv(f'{indata}/elev.csv', dtype={'sid': str}), on='sid', how='left')
    if os.path.exists(f'{indata}/elev_ifs.csv'):
        meta = meta.merge(pd.read_csv(f'{indata}/elev_ifs.csv', dtype={'sid': str}), on='sid', how='left')
    else:
        meta['elev_ifs'] = meta.elev
    common.D = indata
    return meta.reset_index(drop=True)


def kor(indata, analysfiler, korningsfil, modellfil, kandidatfil, ut, sha_kravs=True):
    t0 = time.time()
    kand = json.load(open(kandidatfil, encoding='utf-8'))
    p = {k: float(v) for k, v in kand['parametrar'].items()}
    vantad = next(f['sha256'] for f in kand['filer'] if f['fil'] == 'modell.pkl')
    sha = hashlib.sha256(open(modellfil, 'rb').read()).hexdigest()
    if sha_kravs and sha != vantad:
        raise RuntimeError(f'modell.pkl: sha256 {sha[:12]}… är inte kandidatens {vantad[:12]}… (kuvos/kandidat-2026-27.json)')
    with open(modellfil, 'rb') as fh:
        m = pickle.load(fh)
    names = kand['sardrag']
    meta = las_meta(indata); sids = list(meta.sid); ns = len(sids)
    korningar, A = las_prognos([korningsfil], sids)
    if len(korningar) != 1:
        raise ValueError(f'körningsfilen bär {len(korningar)} körningar, väntat en')
    R = korningar[0]
    if R.hour not in KORNINGAR or R.minute or R.second:
        raise ValueError(f'körningen {R} är inte en av {KORNINGAR} UTC — pariteten kräver kuvösens körningar')
    V, brus = vader(A)
    d = las_analys(analysfiler, set(sids))
    sista = d.tid_utc.max()
    if sista < R - pd.Timedelta(hours=1):
        raise ValueError(f'analysen slutar {sista}, körningen börjar {R}: timmarna före körningen saknas')
    start = R - pd.Timedelta(hours=FONSTER)
    # idx: 45 days up to R − 1 from the analysis, then R … R + 17 as placeholders (the last analysis hour carried forward) that
    # skarv() overwrites with the forecast, step 0's radiation and precipitation excepted (they keep the analysis', as the kuvös).
    idx = pd.date_range(start, R + pd.Timedelta(hours=TIMSTEG - 1), freq='h')
    hk = int(np.searchsorted(idx.values, np.datetime64(R)))
    s0, snotimmar, snosaknade = snotacke_fore(d, sids, start)
    F, fyllda = bygg_F(d[(d.tid_utc >= start) & (d.tid_utc <= R)], sids, idx, min(sista, R), swe0=s0)
    logg(f'{ns} punkter; analysen {idx[0]}–{idx[hk - 1]} ({hk} timmar; {fyllda} saknade punkttimmar ifyllda), körningen {R}, {brus} nederbördsbrus satt till 0')
    # Vakten (steg 5): saknade timmar fylls framåt, men är mer än en procent av fönstret ifyllt är vädret ofullständigt — då räknas
    # inget, i stället för att fysiken drivs 45 dygn på ett väder som står still. Hellre tyst än fel.
    if fyllda > MAX_IFYLLT * hk * ns:
        raise ValueError(f'analysen är ofullständig: {fyllda} av {hk * ns} punkttimmar ifyllda ({100 * fyllda / (hk * ns):.1f} %, taket {100 * MAX_IFYLLT:.0f} %) — kandidaten räknas inte')
    Fa = {k: (v[:hk] if isinstance(v, np.ndarray) and v.ndim == 2 else v) for k, v in F.items()}
    Ts, T5, tillstand = run_lw(Fa, p, spara=[hk - 1])
    a = max(0, hk - FONSTER)
    G, j, L, f2 = skarv(F, hk, a, V, 0, F['swe'][hk - 1])
    Fh = {k: (v[j:] if isinstance(v, np.ndarray) and v.ndim == 2 else v) for k, v in G.items()}
    Tsf, T5f = run_lw(Fh, p, T_init=tillstand[hk - 1])
    Tsw = np.vstack([Ts[a:hk], Tsf]); T5w = np.vstack([T5[a:hk], T5f])
    feat = state_features_mn(base_features_mn(meta, idx[a:hk + L], G, Tsw, T5w), G, Tsw)
    steg = [s for s in LEDTID if s < L]
    rader = [j + s for s in steg]
    X = np.stack([np.asarray(feat[k][rader], np.float32).reshape(-1) for k in names], -1)
    ph = Tsf[steg] + m.predict(X).reshape(len(steg), ns)
    tider = [idx[hk + s] for s in steg]
    ut_df = pd.DataFrame({'punkt': np.tile(sids, len(steg)), 'korning_utc': R.strftime('%Y-%m-%dT%H:%M:%SZ'),
                          'tid_utc': np.repeat([t.strftime('%Y-%m-%dT%H:%M:%SZ') for t in tider], ns),
                          'ts_fysik': np.round(Tsf[steg].reshape(-1), 2), 'ph': np.round(ph.reshape(-1), 2)})
    os.makedirs(ut, exist_ok=True)
    fil = f'{ut}/kandidat_ph_{R.strftime("%Y%m%dT%HZ")}.csv.gz'
    with gzip.open(fil, 'wt', newline='\n') as fh:
        ut_df.to_csv(fh, index=False)
    s = {'korning': str(R), 'timmar': [str(t) for t in tider], 'punkter': ns, 'rader': int(len(ut_df)), 'analys_fran': str(idx[0]),
         'analys_till': str(idx[hk - 1]), 'saknade_punkttimmar_ifyllda': fyllda, 'snotacke_fore_timmar': snotimmar, 'snotacke_fore_saknade': snosaknade,
         'snotacke_vid_start_max_mm': float(s0.max()) if len(s0) else 0.0, 'fyllda_ur_analysen_steg0': f2, 'nederbordsbrus': brus,
         'ph_saknas': int(np.isnan(ph).sum()), 'ts_fysik_min': float(np.nanmin(Tsf[steg])), 'ts_fysik_max': float(np.nanmax(Tsf[steg])),
         'ph_min': float(np.nanmin(ph)), 'ph_max': float(np.nanmax(ph)), 'modell_sha256': sha, 'sekunder': round(time.time() - t0, 1), 'fil': fil}
    json.dump(s, open(f'{ut}/sammanfattning_{R.strftime("%Y%m%dT%HZ")}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    logg(f'klart: {len(steg)} timmar {tider[0]}–{tider[-1]} × {ns} punkter, ph {s["ph_min"]:.1f}–{s["ph_max"]:.1f} °C, '
         f'{s["ph_saknas"]} saknas, {s["sekunder"]} s → {fil}')
    return s, ut_df


def sjalvtest():
    from sklearn.ensemble import HistGradientBoostingRegressor
    rng = np.random.default_rng(3)
    NS, DAGAR = 12, 50                                               # 10 "stations" and 2 road points, 50 days: the 45-day window is exercised
    with tempfile.TemporaryDirectory() as d:
        sids = [str(1000 + i) for i in range(10)] + ['v00000', 'v00001']
        lon = 12 + 8 * rng.random(NS); lat = 56 + 12 * rng.random(NS)
        pd.DataFrame({'sid': sids, 'lon': lon, 'lat': lat}).to_csv(f'{d}/stations.csv', index=False)
        pd.DataFrame({'sid': sids, 'elev': 100 + 300 * rng.random(NS), 'tpi1': rng.normal(0, 5, NS), 'tpi3': rng.normal(0, 10, NS)}).to_csv(f'{d}/elev.csv', index=False)
        pd.DataFrame({'sid': sids, 'Trafik_Adt_samtliga_fordon': 10 ** (2 + 2 * rng.random(NS)), 'Trafik_Adt_tunga_fordon': 50 + 500 * rng.random(NS),
                      'Vagunderhallsklass_Vagunderhallsklass': rng.integers(1, 6, NS), 'FunkVagklass_Klass': rng.integers(0, 10, NS),
                      'Vagnummer_Europavag': rng.choice(['Ja', 'Nej'], NS)}).to_csv(f'{d}/road_all.csv', index=False)
        pd.DataFrame({'sid': sids, **{c: rng.random(NS) for c in ['svf', 'horizon_south', 'tree100', 'chm30', 'water1000', 'built300']}}).to_csv(f'{d}/geofeat.csv', index=False)
        pd.DataFrame({'sid': sids, **{c: rng.normal(0, 20, NS) for c in ['tpi2km', 'tpi5km', 'tpi10km', 'tpi20km', 'vdepth5km', 'vdepth10km']}}).to_csv(f'{d}/geofeat2.csv', index=False)
        R = pd.Timestamp('2026-10-20 06:00')
        idx = pd.date_range(R - pd.Timedelta(days=DAGAR), R, freq='h')                # the analysis up to and including R
        h = np.arange(len(idx))
        rader = []
        for i, s in enumerate(sids):
            ta = -2 + 6 * np.sin(2 * np.pi * h / 24 - 1.5) + 3 * np.sin(2 * np.pi * h / (24 * 9)) + (lat[i] - 62) * -0.4 + rng.normal(0, 0.4, len(h))
            cloud = rng.random(len(h)); sw = np.maximum(0, 150 * np.sin(2 * np.pi * (h % 24) / 24 - 1.6)) * (1 - 0.7 * cloud)
            rader.append(pd.DataFrame({'station_id': s, 'tid_utc': idx.strftime('%Y-%m-%dT%H:%M:%SZ'), 't2m_c': ta, 'rh2m': 0.6 + 0.4 * rng.random(len(h)),
                                       'vind10_ms': 1 + 4 * rng.random(len(h)), 'moln': cloud, 'nederbord_mm': np.where(rng.random(len(h)) < 0.1, 0.5, 0.0),
                                       'langvag_jm2': (0.75 + 0.2 * cloud) * 5.67e-8 * (ta + 274.15) ** 4 * 3600, 'kortvag_jm2': sw * 3600}))
        an = pd.concat(rader)
        # Two day files without header (as metnordic-historik.ts writes them) and one merged file with it.
        dag1 = an[an.tid_utc < '2026-10-19']; dag2 = an[(an.tid_utc >= '2026-10-19') & (an.tid_utc < '2026-10-20')]; dag3 = an[an.tid_utc >= '2026-10-20']
        dag1.to_csv(f'{d}/a1.csv.gz', index=False, header=True); dag2.to_csv(f'{d}/a2.csv.gz', index=False, header=False); dag3.to_csv(f'{d}/a3.csv.gz', index=False, header=False)
        # The forecast run at R, 18 steps, the radiation summed from the run's start is already hourly here; step 0's radiation and
        # precipitation empty, as the live fetch writes them.
        pr = []
        for i, s in enumerate(sids):
            for l in range(18):
                t = R + pd.Timedelta(hours=l)
                pr.append({'station_id': s, 'korning_utc': R.strftime('%Y-%m-%dT%H:%M:%SZ'), 'ledtid_h': l, 'tid_utc': t.strftime('%Y-%m-%dT%H:%M:%SZ'),
                           't2m_c': -1 + 5 * np.sin(2 * np.pi * (t.hour) / 24 - 1.5), 'rh2m': 0.8, 'vind10_ms': 2.0, 'moln': 0.5,
                           'nederbord_mm': np.nan if l == 0 else 0.0, 'langvag_jm2': np.nan if l == 0 else 1_000_000.0, 'kortvag_jm2': np.nan if l == 0 else 200_000.0})
        pd.DataFrame(pr).to_csv(f'{d}/k.csv.gz', index=False)
        # A tiny correction model on random features in the candidate's feature order, pickled; the candidate file names it.
        kand = json.load(open(os.path.join(os.path.dirname(FYS), 'kuvos', 'kandidat-2026-27.json'), encoding='utf-8'))
        names = kand['sardrag']
        m = HistGradientBoostingRegressor(max_iter=5, max_leaf_nodes=4).fit(rng.normal(0, 1, (200, len(names))), rng.normal(0, 0.5, 200))
        with open(f'{d}/modell.pkl', 'wb') as fh: pickle.dump(m, fh, protocol=5)
        sha = hashlib.sha256(open(f'{d}/modell.pkl', 'rb').read()).hexdigest()
        kand2 = dict(kand, filer=[{'fil': 'modell.pkl', 'bytes': os.path.getsize(f'{d}/modell.pkl'), 'sha256': sha}])
        json.dump(kand2, open(f'{d}/kandidat.json', 'w', encoding='utf-8'))
        fel = []
        s, ut_df = kor(d, [f'{d}/a1.csv.gz', f'{d}/a2.csv.gz', f'{d}/a3.csv.gz'], f'{d}/k.csv.gz', f'{d}/modell.pkl', f'{d}/kandidat.json', f'{d}/ut')
        if not (s['punkter'] == NS and s['rader'] == 6 * NS and s['ph_saknas'] == 0): fel.append(f'sex timmar × {NS} punkter utan luckor: {s}')
        if s['saknade_punkttimmar_ifyllda'] != 0: fel.append(f'en hel analys har inga ifyllda punkttimmar: {s["saknade_punkttimmar_ifyllda"]}')
        # Snötäcket vid körningen = ackumuleringen över hela säsongen (DECISIONS #559, #562). Facit räknas här ur källans rader med
        # formeln och talen utskrivna (snö vid luft ≤ +1 °C, 7 cm per mm, avsmältning 0,125 per grad och timme), inte med modulens
        # snotacke_fore eller bygg_F. Det måste finnas snö före fönstret, annars prövar provet ingenting.
        start = R - pd.Timedelta(hours=FONSTER); slut = R - pd.Timedelta(hours=1)
        sa = an.assign(tid=pd.to_datetime(an.tid_utc, utc=True).dt.tz_convert(None)).sort_values(['station_id', 'tid'])
        f_start, f_slut = {}, {}
        for sid_, g in sa.groupby('station_id'):
            sv = 0.0
            for tid, t2, nb in zip(g.tid, g.t2m_c, g.nederbord_mm):
                if tid > slut: break
                if tid == start: f_start[sid_] = sv
                sv = max(sv + 7.0 * nb * (t2 <= 1.0) - 0.125 * max(t2, 0.0), 0.0)
            f_slut[sid_] = sv
        fs = np.array([f_start[x] for x in sids]); fe = np.array([f_slut[x] for x in sids])
        if not fs.max() > 0: fel.append('provet saknar snö före fönstret och prövar därför inte snötäcket')
        dd = las_analys([f'{d}/a1.csv.gz', f'{d}/a2.csv.gz', f'{d}/a3.csv.gz'], set(sids))
        s0, h0, _ = snotacke_fore(dd, sids, start)
        if not np.allclose(s0, fs, atol=1e-9): fel.append(f'snötäcket vid fönstrets början: {np.round(s0, 3)} mot facit {np.round(fs, 3)}')
        iw = pd.date_range(start, slut, freq='h')
        Fw, _ = bygg_F(dd[(dd.tid_utc >= start) & (dd.tid_utc <= slut)], sids, iw, slut, swe0=s0)
        if not np.allclose(Fw['swe'][-1], fe, atol=1e-9): fel.append(f'snötäcket vid körningen: {np.round(Fw["swe"][-1], 3)} mot facit {np.round(fe, 3)}')
        Fn, _ = bygg_F(dd[(dd.tid_utc >= start) & (dd.tid_utc <= slut)], sids, iw, slut)
        if np.allclose(Fn['swe'][-1], fe, atol=1e-9): fel.append('ett snötäcke som börjar på noll gav samma värde vid körningen — provet fäller inte felet')
        if not s.get('snotacke_fore_timmar', 0) == h0 > 0: fel.append(f'sammanfattningen redovisar ackumuleringen: {s.get("snotacke_fore_timmar")} mot {h0}')
        # The restart from the saved state must give the same surface as one continuous run over analysis + forecast (fysik_lw's
        # own proof, here on the live path): recomputed with the module's helpers, compared with the written ts_fysik.
        meta = las_meta(d); sids2 = list(meta.sid)
        korningar, A = las_prognos([f'{d}/k.csv.gz'], sids2); V, _ = vader(A)
        da = las_analys([f'{d}/a1.csv.gz', f'{d}/a2.csv.gz', f'{d}/a3.csv.gz'], set(sids2))
        idx2 = pd.date_range(R - pd.Timedelta(hours=FONSTER), R + pd.Timedelta(hours=TIMSTEG - 1), freq='h'); hk = FONSTER
        F2, _ = bygg_F(da[(da.tid_utc >= idx2[0]) & (da.tid_utc <= R)], sids2, idx2, R)
        G2, j2, L2, _ = skarv(F2, hk, 0, V, 0, F2['swe'][hk - 1])
        Ts_ref, _ = run_lw(G2, p={k: float(v) for k, v in kand['parametrar'].items()})
        ref = Ts_ref[hk + 6:hk + 12].reshape(-1)
        if not np.all(np.abs(ref - ut_df.ts_fysik.to_numpy()) <= 0.0051): fel.append(f'omstarten ur det sparade tillståndet ger inte samma yta som en sammanhängande körning: max {np.max(np.abs(ref - ut_df.ts_fysik.to_numpy())):.3f}')
        # A missing hour for one point is counted as filled, not hidden.
        d2 = da[~((da.station_id == '1003') & (da.tid_utc == pd.Timestamp('2026-10-19 03:00')))]
        d2.assign(tid_utc=d2.tid_utc.dt.strftime('%Y-%m-%dT%H:%M:%SZ')).to_csv(f'{d}/a_hal.csv.gz', index=False, header=False)
        s2, _ = kor(d, [f'{d}/a_hal.csv.gz'], f'{d}/k.csv.gz', f'{d}/modell.pkl', f'{d}/kandidat.json', f'{d}/ut5')
        if s2['saknade_punkttimmar_ifyllda'] != 1: fel.append(f'en saknad punkttimme räknas: {s2["saknade_punkttimmar_ifyllda"]}')
        # A whole missing day (2.2 % of the window) is refused: the chain must not run on weather that stands still.
        d3 = da[~((da.tid_utc >= pd.Timestamp('2026-10-01')) & (da.tid_utc < pd.Timestamp('2026-10-02')))]
        d3.assign(tid_utc=d3.tid_utc.dt.strftime('%Y-%m-%dT%H:%M:%SZ')).to_csv(f'{d}/a_dygn.csv.gz', index=False, header=False)
        try: kor(d, [f'{d}/a_dygn.csv.gz'], f'{d}/k.csv.gz', f'{d}/modell.pkl', f'{d}/kandidat.json', f'{d}/ut6'); fel.append('ett saknat dygn släpptes igenom')
        except ValueError as e:
            if 'ofullständig' not in str(e): fel.append(f'fel skäl för stoppet: {e}')
        if s['timmar'][0] != '2026-10-20 12:00:00' or s['timmar'][-1] != '2026-10-20 17:00:00': fel.append(f'+6 h-klassen är R+6…R+11: {s["timmar"]}')
        if s['analys_till'] != '2026-10-20 05:00:00' or s['analys_fran'] != '2026-09-05 06:00:00': fel.append(f'analysens fönster 45 dygn fram till R−1: {s["analys_fran"]}–{s["analys_till"]}')
        if not (-15 < s['ph_min'] < s['ph_max'] < 20): fel.append(f'orimliga ytor: {s["ph_min"]}–{s["ph_max"]}')
        # The correction is the model's own: ph − ts_fysik must be what the pickled model predicts, not something else.
        if not np.all(np.abs((ut_df.ph - ut_df.ts_fysik).to_numpy()) < 5): fel.append('rättelsen avviker orimligt från fysiken')
        if ut_df.punkt.iloc[-1] != 'v00001' or ut_df.korning_utc.iloc[0] != '2026-10-20T06:00:00Z': fel.append(f'raderna bär punkt och körning: {ut_df.iloc[-1].to_dict()}')
        # A wrong model is refused by its checksum; a run at an hour the kuvös never used is refused.
        try: kor(d, [f'{d}/a1.csv.gz'], f'{d}/k.csv.gz', f'{d}/modell.pkl', os.path.join(os.path.dirname(FYS), 'kuvos', 'kandidat-2026-27.json'), f'{d}/ut2'); fel.append('fel kontrollsumma släpptes igenom')
        except RuntimeError: pass
        pr2 = pd.DataFrame(pr); pr2['korning_utc'] = '2026-10-20T07:00:00Z'; pr2.to_csv(f'{d}/k7.csv.gz', index=False)
        try: kor(d, [f'{d}/a1.csv.gz', f'{d}/a2.csv.gz', f'{d}/a3.csv.gz'], f'{d}/k7.csv.gz', f'{d}/modell.pkl', f'{d}/kandidat.json', f'{d}/ut3'); fel.append('en körning 07Z släpptes igenom')
        except ValueError: pass
        # Analysis ending before the run is refused.
        try: kor(d, [f'{d}/a1.csv.gz'], f'{d}/k.csv.gz', f'{d}/modell.pkl', f'{d}/kandidat.json', f'{d}/ut4'); fel.append('en analys som slutar före körningen släpptes igenom')
        except ValueError: pass
        for f in fel: print('✗', f)
        if fel: sys.exit(1)
        print(f'✓ självtest: fysiken och rättelsen vid {NS} punkter ur 50 dygns syntetisk analys (dagfiler utan rubrik och en fil med) och en '
              f'körning 06Z — +6 h-klassen R+6…R+11, 45-dygnsfönstret, kontrollsumman, körningens klockslag och analysens slut prövade ({s["sekunder"]} s)')


if __name__ == '__main__':
    if '--sjalvtest' in sys.argv:
        sjalvtest(); sys.exit(0)
    ap = argparse.ArgumentParser()
    ap.add_argument('--indata', required=True); ap.add_argument('--analys', nargs='+', required=True); ap.add_argument('--korning', required=True)
    ap.add_argument('--modell', required=True); ap.add_argument('--kandidat', required=True); ap.add_argument('--ut', required=True)
    a = ap.parse_args()
    kor(a.indata, a.analys, a.korning, a.modell, a.kandidat, a.ut)
