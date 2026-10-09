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
from physics import run, SIGMA
from fysik_lw import run_lw
from metnordic import load_mn, magnus_td, CM_PER_MM, FALT
from kedja import veck, kalibrera, base_features_mn, state_features_mn, fit_oof, utdata

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
print('✓ självtest nivå 2: MET Nordic-läsaren (Magnus, snöfall, W/m², uppvärmning ur ECMWF), run_lw = physics.run utan långvåg, 70 särdrag med tre ersatta, kalibrering, rättelse, utdatafil')
