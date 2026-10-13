"""Self-test for nivå 2's chain on synthetic data (no Trafikverket data anywhere): the MET Nordic loader, the copied physics,
the features, the calibration, the learned correction and the output file. Runs in ci.yml.
  python fysik/niva2/sjalvtest.py
"""
import gzip, os, sys, tempfile
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.dirname(HERE)]
import common
from physics import run, SIGMA, DEFAULT
from fysik_lw import run_lw
from metnordic import load_mn, magnus_td, CM_PER_MM, FALT
from kedja import veck, kalibrera, base_features_mn, state_features_mn, fit_oof, utdata
import prognos

NS, NH = 30, 24 * 40                                     # 30 stations, 40 days from 10/10; MET Nordic from 31/10 (hour 504)
IDX = pd.date_range('2024-10-10', periods=NH, freq='h')
T0_MN = pd.Timestamp('2024-10-31')
rng = np.random.default_rng(1)


def bygg(d):
    os.makedirs(f'{d}/ifs'); os.makedirs(f'{d}/ifs2')
    sids = [str(1000 + i) for i in range(NS)]
    lon = 12 + 8 * rng.random(NS); lat = 56 + 12 * rng.random(NS)
    pd.DataFrame({'sid': sids, 'lon': lon, 'lat': lat}).to_csv(f'{d}/stations.csv', index=False)
    pd.DataFrame({'sid': sids, 'elev': 100 + 300 * rng.random(NS), 'tpi1': rng.normal(0, 5, NS), 'tpi3': rng.normal(0, 10, NS)}).to_csv(f'{d}/elev.csv', index=False)
    pd.DataFrame({'sid': sids, 'Trafik_Adt_samtliga_fordon': 10 ** (2 + 2 * rng.random(NS)), 'Trafik_Adt_tunga_fordon': 50 + 500 * rng.random(NS),
                  'Vagunderhallsklass_Vagunderhallsklass': rng.integers(1, 6, NS), 'FunkVagklass_Klass': rng.integers(0, 10, NS),
                  'Vagnummer_Europavag': rng.choice(['Ja', 'Nej'], NS)}).to_csv(f'{d}/road_all.csv', index=False)
    pd.DataFrame({'sid': sids, **{c: rng.random(NS) for c in ['svf', 'horizon_south', 'tree100', 'chm30', 'water1000', 'built300']}}).to_csv(f'{d}/geofeat.csv', index=False)
    pd.DataFrame({'sid': sids, **{c: rng.normal(0, 20, NS) for c in ['tpi2km', 'tpi5km', 'tpi10km', 'tpi20km', 'vdepth5km', 'vdepth10km']}}).to_csv(f'{d}/geofeat2.csv', index=False)
    h = np.arange(NH)
    obs = []
    mn = []
    for i, s in enumerate(sids):
        ta = -4 + 6 * np.sin(2 * np.pi * h / 24 - 1.5) + 4 * np.sin(2 * np.pi * h / (24 * 9)) + (lat[i] - 62) * -0.4 + rng.normal(0, 0.5, NH)
        td = ta - 1 - 2 * rng.random(NH)
        wind = 1 + 4 * rng.random(NH); cloud = rng.random(NH)
        sw = np.maximum(0, 150 * np.sin(2 * np.pi * (h % 24) / 24 - 1.6)) * (1 - 0.7 * cloud)
        precip = np.where(rng.random(NH) < 0.1, 0.5 + rng.random(NH), 0.0)
        snowfall = 7.0 * precip * (ta <= 1)                  # the literal, so a changed CM_PER_MM is caught below
        pd.DataFrame({'time': IDX.strftime('%Y-%m-%dT%H:%M'), 'temperature_2m': ta, 'dew_point_2m': td, 'wind_speed_10m': wind,
                      'cloud_cover': 100 * cloud, 'shortwave_radiation': sw, 'precipitation': precip, 'snowfall': snowfall,
                      'elev_ifs': 120 + 200 * rng.random()}).to_csv(f'{d}/ifs/{s}.csv', index=False)
        pd.DataFrame({'time': IDX.strftime('%Y-%m-%dT%H:%M'), 'snow_depth': 0.05 * rng.random(NH), 'soil_temperature_0_to_7cm': ta + 1,
                      'cloud_cover_low': 100 * cloud * rng.random(NH), 'surface_pressure': 1000.0}).to_csv(f'{d}/ifs2/{s}.csv', index=False)
        tyta = ta - 1.5 + 0.3 * i / NS + rng.normal(0, 0.8, NH)
        obs.append(pd.DataFrame({'sid': s, 't': IDX, 'tyta': tyta, 'tluft': ta, 'daggp': td, 'vimed': wind, 'ned_typ': 0.0, 'ned_maengd': precip}))
        m = IDX >= T0_MN
        rh = np.clip(0.6 + 0.4 * rng.random(m.sum()), 0.05, 1)
        lw = (0.75 + 0.2 * cloud[m]) * SIGMA * (ta[m] + 1 + 273.15) ** 4 * 3600
        mn.append(pd.DataFrame({'station_id': s, 'tid_utc': IDX[m].strftime('%Y-%m-%dT%H:%M:%SZ'), 't2m_c': ta[m] + 1.0, 'rh2m': rh,
                                'vind10_ms': wind[m], 'moln': cloud[m], 'nederbord_mm': precip[m], 'langvag_jm2': lw, 'kortvag_jm2': sw[m] * 3600}))
    pd.concat(obs).to_parquet(f'{d}/vvis_hourly.parquet')
    fil = f'{d}/metnordic_test.csv.gz'
    with gzip.open(fil, 'wt') as fh:
        pd.concat(mn).to_csv(fh, index=False)
    return fil


def k(v, t):
    if not v:
        print(f'✗ {t}'); sys.exit(1)


with tempfile.TemporaryDirectory() as d:
    fil = bygg(d)
    common.D = d
    meta, idx, F, obs, aux = common.load()
    meta2, idx2, G, obs2, aux2, t0 = load_mn(fil)
    i0 = int(np.searchsorted(idx, T0_MN))
    k(len(meta2) == NS and list(meta2.sid) == list(meta.sid) and np.array_equal(obs2, obs, equal_nan=True), 'load_mn: samma stationer, ordning och facit som common.load()')
    k(t0 == T0_MN and i0 == 504, f'MET Nordic börjar {t0} (timme {i0})')
    k(np.allclose(G['ta'][:i0], F['ta'][:i0]) and np.allclose(G['ta'][i0:], F['ta'][i0:] + 1.0), 'uppvärmningen är ECMWF, därefter MET Nordics luft')
    k(np.all(np.isnan(G['lw'][:i0])) and np.all(np.isfinite(G['lw'][i0:])) and 100 < G['lw'][i0:].mean() < 500, 'långvågen: NaN i uppvärmningen, W/m² därefter')
    k(np.all(G['sw'] >= 0) and np.allclose(G['sw'][i0:], F['sw'][i0:]), 'kortvågen: J/m² / 3600 = W/m², aldrig negativ')
    td_v = magnus_td(np.array([0.0, 10.0]), np.array([1.0, 0.5]))
    k(abs(td_v[0]) < 1e-6 and abs(td_v[1] - 0.06) < 0.3, f'Magnus: rh 1 ⇒ daggpunkt = luft, 10 °C/50 % ⇒ ≈ 0 °C (fick {td_v[1]:.2f})')
    k(np.all(G['td'] <= G['ta'] + 1e-9), 'daggpunkten aldrig över luften')
    sn = G['snowfall'][i0:]; pr = G['precip'][i0:]; ta = G['ta'][i0:]
    k(CM_PER_MM == 7.0 and np.allclose(sn[ta <= 1], 7.0 * pr[ta <= 1]) and np.all(sn[ta > 1] == 0) and np.any(ta > 1), 'snöfall = 7 × nederbörd vid luft ≤ +1 °C, annars 0')
    k(np.all(G['elev_diff'] == 0) and G['swe'].shape == F['swe'].shape and np.all(G['swe'] >= 0), 'elev_diff 0 och snötäcket räknat')
    # The copied physics: identical to physics.run without longwave, different with it, and the 5 cm layer is damped.
    F0 = dict(F)
    Ts_orig = run(F0, None)
    Ts_kopia, T5 = run_lw(F0, None)
    k(np.max(np.abs(Ts_orig - Ts_kopia)) < 1e-9, f'run_lw utan långvåg = physics.run (max skillnad {np.max(np.abs(Ts_orig - Ts_kopia)):.2e})')
    Ts_mn, T5_mn = run_lw(G, None)
    k(np.max(np.abs(Ts_mn[i0:] - run(G, None)[i0:])) > 0.05, 'med långvåg skiljer sig ytan från Brutsaert')
    k(np.max(np.abs(Ts_mn[:i0] - run(G, None)[:i0])) < 1e-9, 'i uppvärmningen (lw NaN) räknar run_lw som physics.run')
    k(T5.shape == Ts_kopia.shape and np.std(np.diff(T5, axis=0)) < np.std(np.diff(Ts_kopia, axis=0)), '5 cm-lagret har samma form och svänger mindre än ytan')
    # Folds, calibration (a few evaluations), features, the learned correction (tiny configuration) and the output file.
    fold = veck(meta)
    k(fold.shape == (NS,) and set(fold) <= set(range(5)), 'vecken ur KMeans(25) % 5')
    bas = dict(albedo=0.35, cloud_p=0.3, ch=0.0002, hmin=6.4, q_traffic=-1.0, deep_off=2.9, sw_fac=0.47, eps_ov=0.97, lapse=0.006, r_snow=0, alb_snow=0.55, cover_swe=22.5, cover_t=-0.1)
    p, kal = kalibrera(G, obs, fold, bas, maxfev=6)
    k(all(n in p for n in ['albedo', 'ch', 'r_snow', 'cover_t']) and kal['evals'] >= 6 and np.isfinite(kal['test']['A2']), f'kalibreringen kör och lämnar parametrar ({kal["evals"]} utvärderingar)')
    Ts, T5 = run_lw(G, p)
    feat = state_features_mn(base_features_mn(meta, idx, G, Ts, T5), G, Ts)
    names = list(feat)
    k(len(names) == 70, f'70 särdrag som v4.py (fick {len(names)})')
    k(all(n in names for n in ['snowd', 'soil0', 'cloudlow', 'cloudlow6', 'snowd_x_cold', 'sw_x_snowd', 'swe']), 'de ersatta särdragen finns med sina gamla namn')
    k(all(np.all(np.isfinite(feat[n])) for n in names), 'alla särdrag ändliga')
    k(np.allclose(feat['soil0'], T5.astype(np.float32)) and np.allclose(feat['snowd'], G['swe'].astype(np.float32)), 'soil0 = 5 cm-lagret, snowd = snötäcket')
    k(0.3 <= feat['cloudlow'].min() and feat['cloudlow'].max() <= 1.2, 'cloudlow = effektiv himmelsemissivitet inom 0,3–1,2')
    oof = fit_oof(feat, names, obs, Ts, fold, max_rows=4000, iters=15, lr=0.1, leaves=7, msl=20)
    k(oof.shape == obs.shape and np.all(np.isfinite(oof)), 'rättelsen: en skattning per station och timme')
    k(np.nanmean(np.abs(oof - obs)) < np.nanmean(np.abs(Ts - obs)), 'rättelsen minskar felet mot facit på syntetiska data')
    rader, sha = utdata(oof, idx, meta, f'{d}/ut.csv.gz')
    with gzip.open(f'{d}/ut.csv.gz', 'rt') as fh:
        lines = fh.read().split('\n')
    nh_v = int((idx[-1] - pd.Timestamp('2024-11-01')) / pd.Timedelta('1h')) + 1
    k(lines[0] == 'station_id,t_utc,fysik_c' and rader == NS * (2 * nh_v - 1) and len(sha) == 64, f'utdatafilen: rubrik, {rader} rader = {NS} × (2·{nh_v} − 1), sha256')
    sid, t, v = lines[1].split(',')
    k(t == '2024-11-01T00:00:00Z' and abs(float(v) - oof[int(np.searchsorted(idx, pd.Timestamp('2024-11-01'))), list(meta.sid).index(sid)]) < 0.006, 'första raden bär timvärdet 1/11 00:00')
    # Prognosläget (#519): en "prognos" som är analysen själv. Omstarten från det sparade tillståndet på samma väder ska ge samma
    # yta, och rättelsen ur analysens modeller på de skarvade särdragen samma skattning som analysens egen (ur samma veck).
    _, _, till = run_lw(G, p, spara=[i0 + 23])
    k(np.max(np.abs(run_lw({kk: (v[i0 + 24:] if isinstance(v, np.ndarray) and v.ndim == 2 else v) for kk, v in G.items()}, p, T_init=till[i0 + 23])[0] - Ts[i0 + 24:])) < 1e-9,
      'omstarten från ett sparat tillstånd på samma väder ger samma yta')
    oof2, modeller = prognos.fit_modeller(feat, names, obs, Ts, fold, max_rows=4000, iters=15, lr=0.1, leaves=7, msl=20)
    k(np.array_equal(oof2, oof, equal_nan=True) and len(modeller) == 5, 'fit_modeller = fit_oof, och lämnar fem modeller')
    mnd = pd.read_csv(fil, dtype={'station_id': str})
    mnd['tid'] = pd.to_datetime(mnd.tid_utc, utc=True).dt.tz_convert(None)
    prog = []
    for kt in pd.date_range('2024-11-01', '2024-11-10 18:00', freq='6h'):
        for ld in range(prognos.TIMSTEG):
            x = mnd[mnd.tid == kt + pd.Timedelta(hours=ld)].copy()
            x['korning_utc'] = kt.strftime('%Y-%m-%dT%H:%M:%SZ'); x['ledtid_h'] = ld
            if ld == 0: x[['nederbord_mm', 'langvag_jm2', 'kortvag_jm2']] = np.nan        # tomma i timsteg 0, som i prognosfilen
            if ld == 3: x['nederbord_mm'] = np.where(x.nederbord_mm > 0, x.nederbord_mm, -0.004)  # bruset under 0
            prog.append(x)
    pf = f'{d}/prognos_test.csv.gz'
    pd.concat(prog)[['station_id', 'korning_utc', 'ledtid_h', 'tid_utc'] + prognos.FALT].to_csv(pf, index=False)
    kor_, A = prognos.las_prognos([pf], list(meta.sid))
    V, brus = prognos.vader(A)
    k(len(kor_) == 40 and A['t2m_c'].shape == (40, 30, NS) and brus > 0 and np.nanmin(V['precip']) >= 0, f'prognosfilen: 40 körningar × 30 timsteg, bruset ({brus}) räknat som 0')
    fel = False
    try:
        A2 = {kk: v.copy() for kk, v in A.items()}; A2['nederbord_mm'][0, 5, 0] = -0.02; prognos.vader(A2)
    except ValueError:
        fel = True
    k(fel, 'nederbörd under −0,01 mm fäller läsningen')
    karta = {t: i for i, t in enumerate(idx)}
    spara = sorted(karta[t] - 1 for t in kor_)
    Ts3, T53, till = run_lw(G, p, spara=spara)
    P, TS, n = prognos.prognoslage(meta, idx, G, Ts3, T53, till, p, modeller, fold, names, kor_, V, logga_var=0)
    k(n['korningar'] == 40 and n['fyllda_ur_analysen'] > 0, f"40 omstarter, tomma värden ur analysen ({n})")
    for L in (6, 24):
        m = np.isfinite(P[L])
        rader = np.where(m.any(axis=1))[0]
        k(len(rader) >= 200, f'+{L} h: {len(rader)} timmar täckta')
        dts = np.abs(TS[L][m] - Ts3[m]); dp = np.abs(P[L][m] - oof2[m])
        k(dts.max() < 1e-6, f'+{L} h: fysiken på "prognosen" = analysens (max {dts.max():.1e})')
        print(f'  +{L} h: {int(m.sum())} värden, {100 * np.mean(dp < 1e-3):.2f} % lika, max {dp.max():.2e}'); k(np.mean(dp < 1e-3) > 0.99, f'+{L} h: rättelsen på de skarvade särdragen = analysens skattning ({100 * np.mean(dp < 1e-3):.1f} % lika, max {dp.max():.2e})')
    k(not np.isfinite(P[6][:int(karta[kor_[0]]) + 6]).any(), 'inga värden före första körningens +6 h')
    V2 = {kk: v.copy() for kk, v in V.items()}; V2['ta'][10] += 3.0; V2['td'][10] += 3.0
    P2, TS2, _ = prognos.prognoslage(meta, idx, G, Ts3, T53, till, p, modeller, fold, names, kor_, V2, logga_var=0)
    h10 = karta[kor_[10]]
    k(np.nanmean(TS2[6][h10 + 6:h10 + 12] - TS[6][h10 + 6:h10 + 12]) > 0.5 and np.allclose(P2[6][h10 + 12:h10 + 18], P[6][h10 + 12:h10 + 18]),
      'prognosens luft 3 °C varmare i en körning höjer just den körningens yta, och nästa körning rörs inte')
    # Väg B (DECISIONS #544): varje veck räknas bara med de andra fyra. Kalibreringen får indikatorn (veck == f) och läser då veck f;
    # ändras veck 0:s mätningar ska veck 0:s skattningar stå helt still, i analysen och vid +6 h, medan de andra vecken rör sig.
    import vagb
    liten = dict(max_rows=4000, iters=15, lr=0.1, leaves=7, msl=20)
    k(np.array_equal(vagb.kolumner({'a': np.ones((3, 4)), 'b': np.arange(4.0), 'c': 7}, np.array([1, 3]))['b'], np.array([1.0, 3.0])),
      'väg B: kolumner kapar det som är per station och låter resten stå')
    te0 = np.where(fold == 0)[0]
    p0, kal0 = kalibrera(G, obs, (fold == 0).astype(int), dict(DEFAULT), maxfev=6)
    k(kal0['test'] == common.gates(obs[:, te0], run_lw(vagb.kolumner(G, te0), p0)[0]), 'väg B: kalibreringen med indikatorn läser just veck 0')
    P_an, P_6, TS_an, fold_v, par = vagb.arlig(meta, idx, G, obs, kor_, V, maxfev=25, konfig=liten)
    k(np.array_equal(fold_v, fold) and np.all(np.isfinite(P_an[i0:])) and np.isfinite(P_6).any(axis=1).sum() >= 200, 'väg B: samma veck, analysen och +6 h har värden')
    m6 = np.isfinite(P_6); dp6 = np.abs(P_6[m6] - P_an[m6])
    k(np.mean(dp6 < 1e-3) > 0.99, f'väg B: omstarten för veckets stationer på "prognosen" = analysens skattning ({100 * np.mean(dp6 < 1e-3):.1f} % lika)')
    obs_b = obs.copy(); f0 = fold == 0; obs_b[:, f0] = obs_b[:, f0] + 4.0 + rng.normal(0, 1, obs_b[:, f0].shape)   # veck 0 4 °C varmare
    P_an_b, P_6_b, _, _, par_b = vagb.arlig(meta, idx, G, obs_b, kor_, V, maxfev=25, konfig=liten)
    k(par[0] == par_b[0] and par[1] != par_b[1], 'väg B: veck 0:s parametrar står still när veck 0:s mätningar ändras, veck 1:s rör sig')
    k(np.array_equal(P_an[:, f0], P_an_b[:, f0], equal_nan=True) and np.array_equal(P_6[:, f0], P_6_b[:, f0], equal_nan=True),
      'väg B: veck 0:s skattningar står still när veck 0:s mätningar ändras (analysen och +6 h)')
    k(not np.allclose(P_an[:, ~f0], P_an_b[:, ~f0], equal_nan=True), 'väg B: motprovet — de andra vecken rör sig, där är veck 0 träningsdata')
print('✓ självtest nivå 2: MET Nordic-läsaren (Magnus, snöfall, W/m², uppvärmning ur ECMWF), run_lw = physics.run utan långvåg, 70 särdrag med tre ersatta, kalibrering, rättelse, utdatafil; prognosläget: omstart ur sparat tillstånd, prognosfilen, bruset, skarven och rättelsen på prognosens särdrag; väg B: varje veck bara med de andra fyra (veck 0 står still när dess mätningar ändras)')
