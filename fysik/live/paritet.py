"""Pariteten (kort #343, steg 5): the live chain against the kuvös' frozen procedure on the SAME run.

  python3 fysik/live/paritet.py --indata <dir> --metnordic <analys.csv.gz> --korning <prognosfil>
      --modell <modell.pkl> --kandidat <kuvos/kandidat-2026-27.json> --korningstid 2025-01-15T06 --ut <dir>
  python3 fysik/live/paritet.py --sjalvtest

Why a measurement and not an argument: part A (fysik/live/kandidat_fysik.py) BORROWS run_lw, skarv, las_prognos, vader,
base_features_mn and state_features_mn from the kuvös' frozen modules, but builds two things ITSELF —
  (a) the forcing from MET Nordic (bygg_F) where the kuvös uses metnordic.load_mn, and
  (b) the window and the restart for ONE run, 45 days back with no saved state, where the kuvös' prognoslage runs the column
      from the winter's first hour.
Two sides computing the same thing two ways is exactly what must be measured, not assumed.

What the test does:
  PATH A (frozen): load_mn(the analysis) → run_lw over the analysis → prognoslage() for the ONE run, with the candidate's frozen
    parameters and the candidate's ONE model in all five folds. The fold machinery is then a no-op, so path A is the kuvös' OWN
    function and not a transcript of it.
  PATH B (live): kandidat_fysik.kor() on the same analysis, the same run file and the same model.
  The comparison: ts_fysik (the physics column before the correction) and ph (after it) per point and hour, plus the forcing field
    by field over the window, plus the snowpack at the run's hour — swe, snowd, sn72, h_since_snow, snowd_x_cold and sw_x_snowd are
    six of the candidate's 70 features, and they are the ones a 45-day restart can lose.

Two differences that are KNOWN and registered, and are reported on their own lines rather than hidden in a total:
  1. Where MET Nordic lacks an hour path A falls back on ECMWF (load_mn: G[k] = where(isfinite(mn), mn, ec)) while path B fills
     forward and COUNTS the cell (MAX_IFYLLT, DECISIONS #558 step 5). Parity measured over a window with gaps measures that
     difference, not the chain.
  2. Path A's column has been driven since the winter's first hour; path B's since R − 45 days. The deep boundary (tdeep) is a
     45-day mean and resets, but the snowpack accumulates without a bound. In autumn there is no snow and the two agree; in
     midwinter they need not. THAT is the number this test exists to produce.
"""
import argparse, hashlib, json, os, pickle, sys, tempfile, time
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
FYS = os.path.dirname(HERE)
sys.path[:0] = [HERE, os.path.join(FYS, 'niva2'), FYS]
import common
import metnordic
import prognos as pg
from fysik_lw import run_lw
from kedja import base_features_mn, state_features_mn, logg
from metnordic import magnus_td, CM_PER_MM, SNO_T_C, FALT
import kandidat_fysik as live

SNOFALT = ['swe', 'snowd', 'sn72', 'h_since_snow', 'snowd_x_cold', 'sw_x_snowd']   # the features a 45-day restart can lose


def vag_a(mn_fil, korningsfil, p, m, names, R):
    """The kuvös' own path: load_mn → the column over the whole analysis → prognoslage for the one run, one model in all folds."""
    meta, idx, F, obs, aux, t0 = metnordic.load_mn(mn_fil)
    sids = list(meta.sid); ns = len(sids)
    karta = {t: i for i, t in enumerate(idx)}
    hk = karta.get(pd.Timestamp(R))
    if hk is None:
        raise ValueError(f'körningen {R} ligger inte i analysens timmar {idx[0]}–{idx[-1]}')
    Ts, T5, tillstand = run_lw(F, p, spara=[hk - 1])
    korningar, A = pg.las_prognos([korningsfil], sids)
    if korningar != [pd.Timestamp(R)]:
        raise ValueError(f'körningsfilen bär {korningar}, väntat [{R}]')
    V, brus = pg.vader(A)
    fold = np.arange(ns) % 5                      # all five models are the same, so the fold split cannot change a value
    P, TS, rakn = pg.prognoslage(meta, idx, F, Ts, T5, tillstand, p, [m] * 5, fold, names, korningar, V, logga_var=0)
    steg = [s for s in pg.LEDTIDER[6]]
    tider = [idx[hk + s] for s in steg if hk + s < len(idx)]
    rader = [hk + s for s in steg if hk + s < len(idx)]
    ut = pd.DataFrame({'punkt': np.tile(sids, len(rader)),
                       'tid_utc': np.repeat([t.strftime('%Y-%m-%dT%H:%M:%SZ') for t in tider], ns),
                       'ts_fysik': TS[6][rader].reshape(-1), 'ph': P[6][rader].reshape(-1)})
    sno = sno_vid(meta, idx, F, Ts, T5, hk, sids)
    return ut, dict(punkter=ns, timmar=len(rader), t0=str(t0), analys_fran=str(idx[0]), analys_till=str(idx[hk - 1]),
                    timmar_bakom=hk, nederbordsbrus=brus, **rakn), (meta, idx, F), sno


def sno_vid(meta, idx, F, Ts, T5, hk, sids):
    """The snow features at the hour before the run, out of the chain's own feature builder."""
    a = max(0, hk - pg.FONSTER)
    feat = state_features_mn(base_features_mn(meta, idx[a:hk], {k: (v[a:hk] if isinstance(v, np.ndarray) and v.ndim == 2 else v)
                                                                for k, v in F.items()}, Ts[a:hk], T5[a:hk]),
                             {k: (v[a:hk] if isinstance(v, np.ndarray) and v.ndim == 2 else v) for k, v in F.items()}, Ts[a:hk])
    return {k: np.asarray(feat[k][-1], float) for k in SNOFALT if k in feat}


def bygg_indata_b(indata, meta_a, ut):
    """Path B's indata directory out of the same frozen files: stations.csv limited to the chain's stations (those common.load keeps,
    i.e. the ones with an ifs file) and elev_ifs.csv written out of meta_a, which is what fysik/live/indata.py does for stations
    (DECISIONS #553). The other files are used where they lie. Without this the comparison would measure the plumbing — elev_ifs is
    one of the candidate's 70 features, and las_meta falls back to elev_ifs = elev when the file is missing."""
    os.makedirs(ut, exist_ok=True)
    sids = list(meta_a.sid)
    st = pd.read_csv(f'{indata}/stations.csv', dtype={'sid': str})
    st[st.sid.isin(sids)].to_csv(f'{ut}/stations.csv', index=False)
    pd.read_csv(f'{indata}/elev.csv', dtype={'sid': str}).to_csv(f'{ut}/elev.csv', index=False)
    pd.DataFrame({'sid': sids, 'elev_ifs': meta_a.elev_ifs.to_numpy(float)}).to_csv(f'{ut}/elev_ifs.csv', index=False)
    for f in ('road_all.csv', 'geofeat.csv', 'geofeat2.csv', 'static.json'):
        if os.path.exists(f'{indata}/{f}'):
            with open(f'{indata}/{f}', 'rb') as i, open(f'{ut}/{f}', 'wb') as o: o.write(i.read())
    return ut


def meta_jamfor(meta_a, indata_b):
    """The two metas column by column on the common stations — the features that come from the point and not from the weather."""
    mb = live.las_meta(indata_b)
    gem = sorted(set(meta_a.sid) & set(mb.sid))
    a = meta_a.set_index('sid').reindex(gem); b = mb.set_index('sid').reindex(gem)
    rader = []
    for c in sorted(set(a.columns) & set(b.columns)):
        va, vb = a[c], b[c]
        try:
            d = np.abs(pd.to_numeric(va, errors='coerce').to_numpy(float) - pd.to_numeric(vb, errors='coerce').to_numpy(float))
            d = d[np.isfinite(d)]
            if len(d) and d.max() > 0: rader.append((c, float(np.median(d)), float(d.max())))
        except (TypeError, ValueError):
            olika = int((va.astype(str) != vb.astype(str)).sum())
            if olika: rader.append((c, None, float(olika)))
    return rader, len(gem), list(mb.sid)


def vag_b(indata, analysfiler, korningsfil, modellfil, kandidatfil, ut, sha_kravs):
    s, df = live.kor(indata, analysfiler, korningsfil, modellfil, kandidatfil, ut, sha_kravs=sha_kravs)
    return df[['punkt', 'tid_utc', 'ts_fysik', 'ph']], s


def sno_vag_b(indata, analysfiler, R, p):
    """Path B's snow features at the same hour, built the live way: meta out of the live indata, the forcing out of bygg_F."""
    meta = live.las_meta(indata); sids = list(meta.sid)
    d = live.las_analys(analysfiler, set(sids))
    start = pd.Timestamp(R) - pd.Timedelta(hours=pg.FONSTER)
    idx = pd.date_range(start, pd.Timestamp(R) - pd.Timedelta(hours=1), freq='h')
    s0, _, _ = live.snotacke_fore(d, sids, start)
    F, _ = live.bygg_F(d[(d.tid_utc >= start) & (d.tid_utc < pd.Timestamp(R))], sids, idx, idx[-1], swe0=s0)
    Ts, T5 = run_lw(F, p)
    return sno_vid(meta, idx, F, Ts, T5, len(idx), sids), sids


def jamfor(a, b, sno_a, sno_b, sids_a, sids_b):
    """a and b on (punkt, tid_utc). Returns the rows, the differences and the verdict rows."""
    gem = sorted(set(sids_a) & set(sids_b))
    j = a.merge(b, on=['punkt', 'tid_utc'], suffixes=('_a', '_b'))
    j = j[j.punkt.isin(gem)]
    rader = []
    for f in ('ts_fysik', 'ph'):
        d = np.abs(j[f + '_a'].to_numpy(float) - j[f + '_b'].to_numpy(float))
        d = d[np.isfinite(d)]
        if not len(d):
            rader.append((f, None, None, None, 0)); continue
        rader.append((f, float(np.median(d)), float(np.percentile(d, 95)), float(d.max()), len(d)))
    snorader = []
    for k in SNOFALT:
        if k in sno_a and k in sno_b:
            va = pd.Series(sno_a[k], index=sids_a).reindex(gem).to_numpy(float)
            vb = pd.Series(sno_b[k], index=sids_b).reindex(gem).to_numpy(float)
            d = np.abs(va - vb); d = d[np.isfinite(d)]
            snorader.append((k, float(np.median(d)) if len(d) else None, float(d.max()) if len(d) else None,
                             float(np.nanmedian(np.abs(va))) if len(va) else None))
    return j, rader, snorader, gem


def kraft_jamfor(mn_fil, indata, analysfiler, R, meta_idx_F, sids_b):
    """The forcing field by field over path B's window: path A's G against path B's bygg_F, and the ECMWF fallback cells."""
    meta, idx, F = meta_idx_F[0], meta_idx_F[1], meta_idx_F[2]
    sids_a = list(meta.sid)
    start = pd.Timestamp(R) - pd.Timedelta(hours=pg.FONSTER)
    maska = (idx >= start) & (idx < pd.Timestamp(R))
    d = live.las_analys(analysfiler, set(sids_b))
    idxb = pd.date_range(start, pd.Timestamp(R) - pd.Timedelta(hours=1), freq='h')
    s0, _, _ = live.snotacke_fore(d, sids_b, start)
    Fb, fyllda = live.bygg_F(d[(d.tid_utc >= start) & (d.tid_utc < pd.Timestamp(R))], sids_b, idxb, idxb[-1], swe0=s0)
    gem = sorted(set(sids_a) & set(sids_b))
    ia = [sids_a.index(s) for s in gem]; ib = [sids_b.index(s) for s in gem]
    rader = []
    for k in ('ta', 'td', 'wind', 'cloud', 'sw', 'lw', 'precip', 'snowfall', 'tdeep', 'ta72', 'swe'):
        if k not in F or k not in Fb: continue
        va = np.asarray(F[k])[np.ix_(np.where(maska)[0], ia)]
        vb = np.asarray(Fb[k])[:, ib]
        if va.shape != vb.shape: rader.append((k, None, None, None, None, f'form {va.shape} ≠ {vb.shape}')); continue
        dd = np.abs(va - vb)
        sista = dd[-24:]
        d1 = dd[np.isfinite(dd)]; d2 = sista[np.isfinite(sista)]
        rader.append((k, float(np.median(d1)) if len(d1) else None, float(d1.max()) if len(d1) else None,
                      float(np.median(d2)) if len(d2) else None, float(d2.max()) if len(d2) else None,
                      'bär historia: skiljer sig vid fönstrets början av konstruktion' if k in ('tdeep', 'ta72', 'swe') else ''))
    return rader, fyllda, len(gem)


def kor(indata, mn_fil, analysfiler, korningsfil, modellfil, kandidatfil, R, ut, sha_kravs=True):
    # las_meta sets common.D, which load_ec reads: path A must run with the frozen directory, path B with its own. The value is
    # restored afterwards so a second call in the same process does not read path B's directory as the archive.
    d0 = common.D
    try:
        return _kor(indata, mn_fil, analysfiler, korningsfil, modellfil, kandidatfil, R, ut, sha_kravs)
    finally:
        common.D = d0


def _kor(indata, mn_fil, analysfiler, korningsfil, modellfil, kandidatfil, R, ut, sha_kravs=True):
    t0 = time.time()
    kand = json.load(open(kandidatfil, encoding='utf-8'))
    p = {k: float(v) for k, v in kand['parametrar'].items()}
    names = kand['sardrag']
    sha = hashlib.sha256(open(modellfil, 'rb').read()).hexdigest()
    vantad = next(f['sha256'] for f in kand['filer'] if f['fil'] == 'modell.pkl')
    if sha_kravs and sha != vantad:
        raise RuntimeError(f'modell.pkl: sha256 {sha[:12]}… är inte kandidatens {vantad[:12]}…')
    with open(modellfil, 'rb') as fh:
        m = pickle.load(fh)
    logg(f'väg A (fryst): load_mn + prognoslage på körningen {R}')
    a, sa, mif, sno_a = vag_a(mn_fil, korningsfil, p, m, names, R)
    sids_a = list(mif[0].sid)
    logg(f'  {sa["punkter"]} punkter, {sa["timmar"]} timmar, kolumnen driven {sa["timmar_bakom"]} timmar bakåt')
    logg('väg B (levande): kandidat_fysik.kor på samma analys och samma körning')
    indata_b = bygg_indata_b(indata, mif[0], os.path.join(ut, 'indata-b'))
    mr, nmeta, _ = meta_jamfor(mif[0], indata_b)
    b, sb = vag_b(indata_b, analysfiler, korningsfil, modellfil, kandidatfil, os.path.join(ut, 'vagb'), sha_kravs)
    sno_b, sids_b = sno_vag_b(indata_b, analysfiler, R, p)
    logg(f'  {sb["punkter"]} punkter, kolumnen driven {pg.FONSTER} timmar bakåt, {sb["saknade_punkttimmar_ifyllda"]} ifyllda')
    j, rader, snorader, gem = jamfor(a, b, sno_a, sno_b, sids_a, sids_b)
    kr, fyllda, ngem = kraft_jamfor(mn_fil, indata_b, analysfiler, R, mif, sids_b)
    os.makedirs(ut, exist_ok=True)
    s = {'korning': str(R), 'punkter_a': sa['punkter'], 'punkter_b': sb['punkter'], 'punkter_gemensamma': len(gem),
         'rader_jamforda': int(len(j)), 'vag_a': sa, 'vag_b': {k: sb[k] for k in ('punkter', 'rader', 'analys_fran', 'analys_till',
         'saknade_punkttimmar_ifyllda', 'nederbordsbrus', 'ph_min', 'ph_max')},
         'kolumnen_bakat_a_timmar': sa['timmar_bakom'], 'kolumnen_bakat_b_timmar': pg.FONSTER,
         'falt': [{'falt': f, 'median': md, 'p95': p95, 'max': mx, 'n': n} for f, md, p95, mx, n in rader],
         'snon_vid_korningen': [{'falt': f, 'median_diff': md, 'max_diff': mx, 'median_niva_a': niv} for f, md, mx, niv in snorader],
         'kraften': [{'falt': f, 'median': md, 'max': mx, 'median_sista_dygnet': md2, 'max_sista_dygnet': mx2, 'not': nt}
                     for f, md, mx, md2, mx2, nt in kr],
         'metan': [{'kolumn': c, 'median': md, 'max_eller_antal_olika': mx} for c, md, mx in mr], 'metan_punkter': nmeta,
         'ifyllda_punkttimmar_vag_b': fyllda, 'sekunder': round(time.time() - t0, 1)}
    json.dump(s, open(os.path.join(ut, f'paritet_{pd.Timestamp(R).strftime("%Y%m%dT%HZ")}.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    j.to_csv(os.path.join(ut, f'paritet_rader_{pd.Timestamp(R).strftime("%Y%m%dT%HZ")}.csv.gz'), index=False)
    for f, md, p95, mx, n in rader:
        if md is None:
            logg(f'  {f}: INGA jämförbara rader — pariteten är inte mätt'); continue
        logg(f'  {f}: median {md:.4f} °C, p95 {p95:.4f}, max {mx:.4f} över {n} rader')
    for f, md, mx, niv in snorader:
        if md is None:
            logg(f'  snö {f}: inga jämförbara värden'); continue
        logg(f'  snö {f}: median diff {md:.4f}, max {mx:.4f} (väg A:s egen mediannivå {niv:.4f})')
    if mr:
        for c, md, mx in mr:
            logg(f'  meta {c}: {"olika i " + str(int(mx)) + " stationer" if md is None else f"median {md:.6f}, max {mx:.6f}"}')
    else:
        logg(f'  meta: alla gemensamma kolumner lika över {nmeta} stationer')
    for f, md, mx, md2, mx2, nt in kr:
        r = lambda x: 'ingen' if x is None else round(x, 6)
        logg(f'  kraft {f}: hela fönstret median {r(md)} max {r(mx)}; sista dygnet median {r(md2)} max {r(mx2)} {nt}')
    return s


def sjalvtest():
    """Both paths on ONE fabricated source where the ECMWF window and MET Nordic cover exactly the same hours, so the two columns
    start at the same hour and nothing but the code can differ: the parity must then be ~0. Then a mutation on the live side only
    (CM_PER_MM) which the parity must report as a difference — otherwise the test proves nothing."""
    from sklearn.ensemble import HistGradientBoostingRegressor
    rng = np.random.default_rng(11)
    NS, DAGAR = 8, 48
    fel = []
    with tempfile.TemporaryDirectory() as d:
        sids = [str(2000 + i) for i in range(NS)]
        lon = 13 + 6 * rng.random(NS); lat = 57 + 9 * rng.random(NS)
        elev = 50 + 400 * rng.random(NS)
        pd.DataFrame({'sid': sids, 'lon': lon, 'lat': lat}).to_csv(f'{d}/stations.csv', index=False)
        pd.DataFrame({'sid': sids, 'elev': elev, 'tpi1': rng.normal(0, 5, NS), 'tpi3': rng.normal(0, 10, NS)}).to_csv(f'{d}/elev.csv', index=False)
        pd.DataFrame({'sid': sids, 'elev_ifs': elev}).to_csv(f'{d}/elev_ifs.csv', index=False)
        pd.DataFrame({'sid': sids, 'Trafik_Adt_samtliga_fordon': 10 ** (2 + 2 * rng.random(NS)),
                      'Trafik_Adt_tunga_fordon': 50 + 500 * rng.random(NS),
                      'Vagunderhallsklass_Vagunderhallsklass': rng.integers(1, 6, NS), 'FunkVagklass_Klass': rng.integers(0, 10, NS),
                      'Vagnummer_Europavag': rng.choice(['Ja', 'Nej'], NS)}).to_csv(f'{d}/road_all.csv', index=False)
        pd.DataFrame({'sid': sids, **{c: rng.random(NS) for c in ['svf', 'horizon_south', 'tree100', 'chm30', 'water1000', 'built300']}}).to_csv(f'{d}/geofeat.csv', index=False)
        pd.DataFrame({'sid': sids, **{c: rng.normal(0, 20, NS) for c in ['tpi2km', 'tpi5km', 'tpi10km', 'tpi20km', 'vdepth5km', 'vdepth10km']}}).to_csv(f'{d}/geofeat2.csv', index=False)
        R = pd.Timestamp('2025-01-15 06:00')
        idx = pd.date_range(R - pd.Timedelta(days=DAGAR), R + pd.Timedelta(hours=pg.TIMSTEG - 1), freq='h')
        h = np.arange(len(idx))
        # MET Nordic: the analysis up to and including R, snow in the first half so a snowpack builds and can be lost.
        rader = []
        for i, s in enumerate(sids):
            ta = -4 + 5 * np.sin(2 * np.pi * h / 24 - 1.5) + 4 * np.sin(2 * np.pi * h / (24 * 11)) + (lat[i] - 62) * -0.4 + rng.normal(0, 0.4, len(h))
            cloud = rng.random(len(h)); sw = np.maximum(0, 90 * np.sin(2 * np.pi * (h % 24) / 24 - 1.6)) * (1 - 0.7 * cloud)
            precip = np.where(rng.random(len(h)) < 0.12, 0.8, 0.0) * (h < len(h) // 2)
            rader.append(pd.DataFrame({'station_id': s, 'tid_utc': idx.strftime('%Y-%m-%dT%H:%M:%SZ'), 't2m_c': ta,
                                       'rh2m': 0.6 + 0.4 * rng.random(len(h)), 'vind10_ms': 1 + 4 * rng.random(len(h)), 'moln': cloud,
                                       'nederbord_mm': precip, 'langvag_jm2': (0.75 + 0.2 * cloud) * 5.67e-8 * (ta + 274.15) ** 4 * 3600,
                                       'kortvag_jm2': sw * 3600}))
        an = pd.concat(rader)
        anal = an                                                       # the whole window, as the archive's winter file
        anal.to_csv(f'{d}/mn.csv.gz', index=False)                      # the merged analysis, for load_mn AND las_analys
        # ECMWF: the same hours as the analysis, so load_mn's index equals path B's window start and nothing is a fallback.
        os.makedirs(f'{d}/ifs', exist_ok=True)
        aidx = idx                                                  # naive and the whole window, as the frozen ifs files are
        for i, s in enumerate(sids):
            r = anal[anal.station_id == s].sort_values('tid_utc')
            pd.DataFrame({'time': aidx, 'temperature_2m': r.t2m_c.to_numpy(), 'dew_point_2m': r.t2m_c.to_numpy() - 2.0,
                          'wind_speed_10m': r.vind10_ms.to_numpy(), 'cloud_cover': 100 * r.moln.to_numpy(),
                          'shortwave_radiation': r.kortvag_jm2.to_numpy() / 3600, 'precipitation': r.nederbord_mm.to_numpy(),
                          'snowfall': CM_PER_MM * r.nederbord_mm.to_numpy(), 'elev_ifs': elev[i]}).to_csv(f'{d}/ifs/{s}.csv', index=False)
        pd.DataFrame({'sid': np.repeat(sids, len(aidx)), 't': np.tile(aidx, NS), 'tyta': rng.normal(-2, 3, NS * len(aidx)),
                      'tluft': rng.normal(-3, 3, NS * len(aidx)), 'daggp': rng.normal(-5, 3, NS * len(aidx)),
                      'vimed': rng.random(NS * len(aidx)), 'ned_typ': 0.0,
                      'ned_maengd': 0.0}).to_parquet(f'{d}/vvis_hourly.parquet', index=False)
        # The run at R, 18 steps; step 0's radiation and precipitation empty, as the live fetch writes them.
        pr = []
        for i, s in enumerate(sids):
            rr = an.set_index(['station_id', 'tid_utc'])
            for l in range(18):
                t = R + pd.Timedelta(hours=l)
                k = (s, t.strftime('%Y-%m-%dT%H:%M:%SZ'))
                row = rr.loc[k] if k in rr.index else None
                pr.append({'station_id': s, 'korning_utc': R.strftime('%Y-%m-%dT%H:%M:%SZ'), 'ledtid_h': l,
                           'tid_utc': t.strftime('%Y-%m-%dT%H:%M:%SZ'),
                           't2m_c': float(row.t2m_c) if row is not None else -2.0, 'rh2m': 0.8, 'vind10_ms': 2.0, 'moln': 0.5,
                           'nederbord_mm': np.nan if l == 0 else 0.0, 'langvag_jm2': np.nan if l == 0 else 1_000_000.0,
                           'kortvag_jm2': np.nan if l == 0 else 150_000.0})
        pd.DataFrame(pr).to_csv(f'{d}/k.csv.gz', index=False)
        kand = json.load(open(os.path.join(os.path.dirname(FYS), 'kuvos', 'kandidat-2026-27.json'), encoding='utf-8'))
        names = kand['sardrag']
        m = HistGradientBoostingRegressor(max_iter=6, max_leaf_nodes=4).fit(rng.normal(0, 1, (300, len(names))), rng.normal(0, 0.5, 300))
        with open(f'{d}/modell.pkl', 'wb') as fh: pickle.dump(m, fh, protocol=5)
        sha = hashlib.sha256(open(f'{d}/modell.pkl', 'rb').read()).hexdigest()
        json.dump(dict(kand, filer=[{'fil': 'modell.pkl', 'bytes': os.path.getsize(f'{d}/modell.pkl'), 'sha256': sha}]),
                  open(f'{d}/kandidat.json', 'w', encoding='utf-8'))
        common.D = d
        TAK = 0.02                      # the self-test's own facit: both paths start in the same hour here, so only code can differ
        s = kor(d, f'{d}/mn.csv.gz', [f'{d}/mn.csv.gz'], f'{d}/k.csv.gz', f'{d}/modell.pkl', f'{d}/kandidat.json', R, f'{d}/ut')
        if s['punkter_gemensamma'] != NS: fel.append(f'{s["punkter_gemensamma"]} gemensamma punkter, väntat {NS}')
        if s['rader_jamforda'] != NS * 6: fel.append(f'{s["rader_jamforda"]} jämförda rader, väntat {NS * 6}')
        # Snötäcket ackumuleras från säsongens början i båda vägarna (DECISIONS #562): på den här källan börjar de på samma
        # timme, så snöraderna ska vara lika. Faller det här har den levande kedjan börjat på noll igen.
        for r in s['snon_vid_korningen']:
            if r['falt'] == 'swe' and (r['max_diff'] is None or r['max_diff'] > 1e-6):
                fel.append(f'snötäcket skiljer mellan vägarna på en källa där de startar lika: max {r["max_diff"]}')
        for r in s['falt']:
            if r['max'] is None or r['max'] > TAK:
                fel.append(f'{r["falt"]}: max {r["max"]} på en källa där vägarna startar i samma timme — ingen parität')
        # MOTPROVEN: två mutationer på BARA den levande sidan, var och en måste fällas. (CM_PER_MM duger inte som lever:
        # ett djupt snötäcke mättar täckningsgraden, så mer snö per millimeter rör ingen yttemperatur — mätt 14/10.)
        ekta = live.bygg_F
        for namn, vrid, vad in (('ta + 0,5 °C', lambda F: dict(F, ta=F['ta'] + 0.5), 'falt'),
                                ('swe = 0', lambda F: dict(F, swe=np.zeros_like(F['swe'])), 'snon_vid_korningen')):
            try:
                live.bygg_F = lambda *a, **k: (lambda r: (vrid(r[0]), r[1]))(ekta(*a, **k))
                s2 = kor(d, f'{d}/mn.csv.gz', [f'{d}/mn.csv.gz'], f'{d}/k.csv.gz', f'{d}/modell.pkl', f'{d}/kandidat.json', R,
                         f'{d}/ut_{vad}')
            finally:
                live.bygg_F = ekta
            if vad == 'falt':
                if not [r for r in s2['falt'] if r['max'] is not None and r['max'] > TAK]:
                    fel.append(f'motprovet {namn} på den levande sidan gav ingen skillnad i ts_fysik/ph — provet mäter ingenting')
            else:
                ren = {r['falt']: r for r in s['snon_vid_korningen']}
                if not [r for r in s2['snon_vid_korningen']
                        if r['max_diff'] is not None and r['max_diff'] > (ren.get(r['falt'], {}).get('max_diff') or 0) + 1e-9]:
                    fel.append(f'motprovet {namn} syntes inte på snöraderna — de mäter ingenting')
    if fel:
        for f in fel: print('✗', f)
        sys.exit(1)
    print(f'✓ självtest: pariteten mäter båda vägarna på samma källa (max-skillnad ≤ {TAK} °C när de startar i samma timme), '
          'snöraderna vid körningen jämförs, och två mutationer på bara den levande sidan (ta + 0,5 °C och swe = 0) fälls')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--sjalvtest', action='store_true')
    ap.add_argument('--indata'); ap.add_argument('--metnordic'); ap.add_argument('--analys', nargs='+')
    ap.add_argument('--korning'); ap.add_argument('--modell'); ap.add_argument('--kandidat')
    ap.add_argument('--korningstid'); ap.add_argument('--ut')
    a = ap.parse_args()
    if a.sjalvtest:
        sjalvtest()
    else:
        for k in ('indata', 'metnordic', 'korning', 'modell', 'kandidat', 'korningstid', 'ut'):
            if not getattr(a, k): ap.error(f'--{k} krävs')
        kor(a.indata, a.metnordic, a.analys or [a.metnordic], a.korning, a.modell, a.kandidat,
            pd.Timestamp(a.korningstid), a.ut)
