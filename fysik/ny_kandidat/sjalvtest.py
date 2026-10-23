"""Självtestet för den nya kandidatens kedja (fysik/ny_kandidat/), på påhittade data — ingen rad ur Trafikverkets leverans. Körs i ci.yml.
  python fysik/ny_kandidat/sjalvtest.py
Prövar:
  1. reserven: långvågen tas alltid ur reserven — MET:s kolumn påverkar ingenting (orimliga värden eller tom ger samma F, samma
     fysik och samma särdrag), F['lw'] är reserven, run_lw med den är run_lw utan långvåg (den inbyggda reserven), cloudlow är
     reservens emissivitet, och kalibreringen kan inte flytta reservens parametrar; uttrycken mot fysik_lw.py:s och kedja.py:s text;
  2. vinden: MET:s vind10_ms (ur x och y i hämtningen) är kedjans vind, och en tom vindkolumn fäller MET-provet i stället för att
     fyllas tyst med ECMWF:s;
  3. vecken: enheterna (ingen enhet tränar på en vinter den förutsäger; parvalets skattningar har varken sett träningsvintern eller den
     utelämnade), staplingen (fysiken och särdragen för en vinter i staplingen är desamma bit för bit som för vintern ensam, också med
     skottåret), en utelämnad vinter läses utan mätningar, och träningen med talen i urvalet;
  4. spärren: utkastet, en statusrad utan signaturer och signaturer utan statusrad vägrar (utgångskod 2), också i prövningens egna lägen
     och i --sparren; signerad släpper;
  5. måtten: prövningens mått är matt.matt() oförändrad, parvalets 15 par ger timme():s PB bit för bit, och de grova felen per par är
     matt.matt():s med det paret; medlet över vintrarna;
  6. hela kedjan på tre påhittade vintrar: förberedningen (tidszonen, MET utan långvåg), planen (identitetsprovet krävs, en vinter som
     föll tas bort, annan läskod vägras), träningen av en enhet (två utelämnade vintrar) och vägran när en utelämnad vinters filer finns i
     jobbet, prövningen av ett veck — parvalet står still när den utelämnade vinterns mätningar och skattningar ändras men rör sig när en
     träningsvinters gör det, och en skattning med fel summa fälls —, den slutligas par och samman med kandidatfilen (bara aggregat).
     Enheterna utom den tränade får påhittade skattningar: prövningen läser bara skattningen, inte hur den räknades.
  7. tillägget (docs/FORREGISTRERING-NY-KANDIDAT-TILLAGG-2026-10-23.md): T1 — SMHI:s station 7 tas ur listan innan paren väljs, och
     en station 7 med klockan en timme fel fäller provet utan T1 men inte med; tidszon.py är orörd; T2 — fyllningens listor summeras
     per vinter och redovisas i förberedningens markdown.
"""
import contextlib, copy, glob, gzip, importlib.util, io, json, math, os, shutil, subprocess, sys, tempfile, time, types
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
FYS = os.path.dirname(HERE)
ROT = os.path.dirname(FYS)
sys.path.insert(0, HERE)
import kedjan, sparren, forbered, trana, provning
from kedjan import lasare, common
import matt
from physics import DEFAULT, sky_emissivity
from fysik_lw import run_lw
from kedja import base_features_mn, state_features_mn, KAL_NAMN
from kandidat_timme import timme
from vagb_blandning import GRID

# Vintrarnas självtest som bibliotek för de påhittade leveranserna, ur sin egen sökväg och under ett eget namn (inte via sys.path).
_spec = importlib.util.spec_from_file_location('vintrar_sjalvtest', os.path.join(FYS, 'vintrar', 'sjalvtest.py'))
vs = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(vs)
SIDS = vs.SIDS

fel = []
T0 = time.time()


def k(ok, msg):
    if not ok:
        fel.append(msg)


def tyst(f, *a, **kw):
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        return f(*a, **kw)


def text(rel):
    return open(os.path.join(ROT, rel), encoding='utf-8').read()


# ── Påhittade vintrar ────────────────────────────────────────────────────────────────────────────────────────────────────────────
def luften_v(idx):
    """vs.luften för alla stationer och timmar på en gång."""
    h = ((pd.DatetimeIndex(idx) - pd.Timestamp('2022-10-01')) / pd.Timedelta('1h')).to_numpy(float)[:, None]
    i = np.arange(len(SIDS))[None, :]
    return -1 + 3 * np.sin(2 * np.pi * h / 24) + 2 * np.sin(2 * np.pi * h / 127 + i) + 1.5 * np.sin(h * 0.71 + 2 * i) * np.cos(h * 0.13)


def rad_b(sid, lokal, bias=0.0, sek='00'):
    """vs.rad med ytan förskjuten bias grader."""
    utc = pd.Timestamp(lokal).tz_localize('Europe/Stockholm', ambiguous=False, nonexistent='shift_forward').tz_convert('UTC').tz_localize(None)
    yta = vs.luften(sid, utc.floor('h')) - 1.5 + 0.2 * math.sin(SIDS.index(sid) + utc.hour) + bias
    return vs.rad(sid, lokal, tyta=float(yta), sek=sek)


def leverans(mapp, namn, bias=0.0):
    """En vinter i 21/10-formen: Halkvakt_A-2.csv (1–5/11 varje hel timme, nog för SMHI-provets 100 timpar) och Halkvakt_B-1.csv.gz
    (sommartidsnatten utan timme 02). Bara hela timmar, så att populationen har få halvtimmar och timme() går fort."""
    os.makedirs(mapp, exist_ok=True)
    a = int(namn[:4]); b = a + 1
    host = [rad_b(s, t, bias, '03') for t in pd.date_range(f'{a}-11-01 00:00', f'{a}-11-05 23:00', freq='h') for s in SIDS]
    dst = lasare.sista_sondag_i_mars(b)
    vinter = [rad_b(s, t, bias) for t in pd.date_range(dst, dst + pd.Timedelta('9h'), freq='h') if t.hour != 2 for s in SIDS]
    vs.skriv(os.path.join(mapp, f'Halkvakt_{a}-2.csv'), vs.RUBRIK_NY, host)
    vs.skriv(os.path.join(mapp, f'Halkvakt_{b}-1.csv.gz'), vs.RUBRIK_NY, vinter, packa=True)


def smhi(mapp, fran, till):
    """vs.smhi för valfri period: SMHI:s stationslista och serier som följer luften utan förskjutning."""
    os.makedirs(mapp, exist_ok=True)
    json.dump({'station': [{'key': 9001 + i, 'name': f'Prov {i}', 'latitude': float(vs.LAT[i] + 0.01), 'longitude': float(vs.LON[i]),
                            'from': 0, 'to': 2e12} for i in range(len(SIDS))]}, open(f'{mapp}/smhi_p1.json', 'w', encoding='utf-8'))
    t = pd.date_range(fran, till, freq='h'); L = luften_v(t)
    for i in range(len(SIDS)):
        rader = ['Stationsnamn;Klimatnummer;Mäthöjd (meter över marken)', f'Prov {i};{9001 + i};2.0', '', 'Datum;Tid (UTC);Lufttemperatur;Kvalitet;;Tidsutsnitt:']
        rader += [f"{x.strftime('%Y-%m-%d')};{x.strftime('%H:%M:%S')};{L[j, i] + 0.05 * math.sin(7 * x.hour + i):.1f};G" for j, x in enumerate(t)]
        open(f'{mapp}/smhi_{9001 + i}.csv', 'w', encoding='utf-8').write('\n'.join(rader) + '\n')


def ecmwf_v(mapp, fran, till):
    """vs.ecmwf med samma formler, vektoriserat."""
    os.makedirs(mapp, exist_ok=True)
    idx = pd.date_range(fran, pd.Timestamp(till) + pd.Timedelta(hours=23), freq='h')
    h = np.arange(len(idx)); TA = luften_v(idx)
    for i, s in enumerate(SIDS):
        ta = TA[:, i]; cloud = 0.5 + 0.4 * np.sin(h / 17.0 + i); pr = np.where(np.sin(h / 5.0 + i) > 0.9, 0.6, 0.0)
        pd.DataFrame({'time': idx.strftime('%Y-%m-%dT%H:%M'), 'temperature_2m': ta, 'dew_point_2m': ta - 2, 'wind_speed_10m': 2 + np.cos(h / 9.0),
                      'cloud_cover': 100 * cloud, 'shortwave_radiation': np.maximum(0, 80 * np.sin(2 * np.pi * (h % 24) / 24 - 1.6)),
                      'precipitation': pr, 'snowfall': 7.0 * pr * (ta <= 1), 'elev_ifs': 100.0 + i}).to_csv(f'{mapp}/{s}.csv', index=False)


def metnordic_v(filer, fran, till):
    """vs.metnordic med samma formler, vektoriserat (långvågen plausibel; varianterna skrivs om i vinterns_data)."""
    idx = pd.date_range(fran, pd.Timestamp(till) + pd.Timedelta(hours=23), freq='h')
    TA = luften_v(idx) + 0.3
    for fil, del_ in zip(filer, np.array_split(np.arange(len(idx)), len(filer))):
        h = del_.astype(float); t = idx[del_]
        rader = []
        for i, s in enumerate(SIDS):
            ta = TA[del_, i]; cloud = 0.5 + 0.4 * np.sin(h / 17.0 + i)
            rader.append(pd.DataFrame({'station_id': s, 'tid_utc': t.strftime('%Y-%m-%dT%H:%M:%SZ'), 't2m_c': ta.round(2), 'rh2m': 0.85,
                                       'vind10_ms': 2 + np.cos(h / 9.0), 'moln': cloud, 'nederbord_mm': np.where(np.sin(h / 5.0 + i) > 0.9, 0.6, 0.0),
                                       'langvag_jm2': (0.75 + 0.2 * cloud) * 5.67e-8 * (ta + 273.15) ** 4 * 3600,
                                       'kortvag_jm2': np.maximum(0, 80 * np.sin(2 * np.pi * (h % 24) / 24 - 1.6)) * 3600}))
        with gzip.open(fil, 'wt', newline='') as fh:
            pd.concat(rader).to_csv(fh, index=False)


_BAS = {}


def vinterns_data(rot, namn, langvag='plausibel', vind=None):
    """rot/<namn>/: ifs/ (ECMWF 10/10–31/3), metnordic/ (31/10–31/3, två delar) och vvis/, byggda en gång per vinter och kopierade.
    langvag: 'plausibel', 'orimlig' (1e9 J/m²) eller 'tom'. vind: None, 'xy' (vind10_ms = √(x² + y²) ur påhittade komponenter, skilda
    från ECMWF:s) eller 'tom'."""
    if namn not in _BAS:
        a = int(namn[:4]); b = a + 1
        d = os.path.join(_BAS['_rot'], namn)
        ecmwf_v(os.path.join(d, 'ifs'), f'{a}-10-10', f'{b}-03-31')
        os.makedirs(os.path.join(d, 'metnordic'))
        metnordic_v([os.path.join(d, 'metnordic', f'metnordic_reserv_del{i}.csv.gz') for i in (1, 2)], f'{a}-10-31', f'{b}-03-31')
        leverans(os.path.join(d, 'vvis'), namn)
        _BAS[namn] = d
    d = os.path.join(rot, namn)
    shutil.copytree(_BAS[namn], d)
    if langvag != 'plausibel' or vind:
        for f in sorted(glob.glob(os.path.join(d, 'metnordic', '*.csv.gz'))):
            x = pd.read_csv(f, dtype={'station_id': str})
            if langvag == 'orimlig': x['langvag_jm2'] = 1e9
            if langvag == 'tom': x['langvag_jm2'] = np.nan
            if vind == 'xy':
                h = ((pd.to_datetime(x.tid_utc) - pd.Timestamp('2018-01-01', tz='UTC')) / pd.Timedelta('1h')).to_numpy(float)
                x['vind10_ms'] = np.hypot(3 * np.sin(h / 7.0), 4 * np.cos(h / 11.0)).round(3)
            elif vind == 'tom':
                x['vind10_ms'] = np.nan
            with gzip.open(f, 'wt', newline='') as fh:
                x.to_csv(fh, index=False)
    return d


def las(rot, namn, ind, arbete, vvis=True):
    d = os.path.join(rot, namn)
    return kedjan.las_vinter(namn, ind, os.path.join(d, 'ifs'), sorted(glob.glob(os.path.join(d, 'metnordic', '*.csv.gz'))),
                             arbete, vvis=os.path.join(d, 'vvis') if vvis else None)


# ── 1. Reserven ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def reserven(d):
    ind = os.path.join(d, 'indata'); os.makedirs(ind); vs.fasta(ind)
    w = {}
    for lv in ('orimlig', 'tom'):
        r = os.path.join(d, lv); vinterns_data(r, '2022-23', langvag=lv)
        w[lv] = tyst(las, r, '2022-23', ind, os.path.join(d, 'a-' + lv), vvis=False)
    F = w['tom']['F']
    k(np.array_equal(w['orimlig']['F']['lw'], F['lw']) and np.isfinite(F['lw']).all(),
      'F["lw"] är densamma med MET:s långvåg orimlig (1e9 J/m²) och tom — och ändlig varje timme')
    k(np.array_equal(F['lw'], kedjan.reserv_lw(F)), 'F["lw"] är reserven')
    mn = pd.read_csv(os.path.join(d, 'a-orimlig', 'metnordic_reserv_2022-23.csv.gz'))
    k(mn.langvag_jm2.isna().all() and len(mn) > 0, 'MET:s långvåg är tömd i filen kedjan läser')
    p = dict(DEFAULT); p.update(r_snow=0.1, albedo=0.2)
    G = {kk: v for kk, v in F.items() if kk != 'lw'}
    Ts1, T51 = run_lw(F, p); Ts2, _ = run_lw(G, p)
    dmax = float(np.nanmax(np.abs(Ts1 - Ts2)))
    k(dmax <= 1e-9 and np.isfinite(Ts1).all(), f'run_lw med reserven i F["lw"] = run_lw utan långvåg (den inbyggda reserven): största skillnad {dmax:.1e}')
    common.D = w['tom']['D']
    f1 = base_features_mn(w['tom']['meta'], w['tom']['idx'], F, Ts1, T51)
    f2 = base_features_mn(w['orimlig']['meta'], w['orimlig']['idx'], w['orimlig']['F'], Ts1, T51)
    k(np.array_equal(f1['cloudlow'], f2['cloudlow']) and np.array_equal(f1['cloudlow6'], f2['cloudlow6']), 'cloudlow och cloudlow6 rörs inte av MET:s långvåg')
    eps = np.clip(sky_emissivity(F['ta'], np.minimum(F['td'], F['ta']), F['cloud'], DEFAULT), 0.3, 1.2).astype(np.float32)
    k(np.allclose(f1['cloudlow'], eps, rtol=1e-6, atol=0), 'cloudlow är reservens emissivitet (kedja.py:114–117 på reserven)')
    k(not set(kedjan.HIMLEN) & set(KAL_NAMN), f'kalibreringen flyttar inte reservens parametrar: {set(kedjan.HIMLEN) & set(KAL_NAMN)}')
    try:
        kedjan.kontrollera_reserv(dict(DEFAULT, cloud_p=0.3)); k(False, 'en flyttad cloud_p ska fällas')
    except RuntimeError:
        pass
    kedjan.kontrollera_reserv(dict(DEFAULT, albedo=0.3, ch=0.001))
    fl = text('fysik/niva2/fysik_lw.py')
    k("ta_all = F['ta'] - q['lapse'] * F['elev_diff'][None, :]" in fl and "td_all = np.minimum(F['td'] - q['lapse'] * F['elev_diff'][None, :], ta_all)" in fl
      and "eps_a = sky_emissivity(ta, td, F['cloud'][h], q)" in fl and "Lsky = eps_a * SIGMA * (ta + 273.15) ** 4" in fl
      and "Lsky = np.where(np.isfinite(lw_all[h]), lw_all[h], Lsky)" in fl, 'reservens uttryck som fysik_lw.run_lw:s')
    kd = text('fysik/niva2/kedja.py')
    k("eps = F['lw'] / (SIGMA * (F['ta'] + 273.15) ** 4)" in kd and "feat['cloudlow'] = pd.DataFrame(np.clip(eps, 0.3, 1.2)).ffill().bfill().to_numpy()" in kd,
      'cloudlow räknas ur F["lw"] i kedja.py')
    pr = kedjan.las_json(kedjan.MANIFEST)['procedur']
    from kedja import A2_KONFIG
    k(pr['vintrar'] == list(kedjan.VINTRAR) and pr['kalibrering']['parametrar'] == list(KAL_NAMN) and pr['kalibrering']['maxfev'] == 120
      and pr['rattelse'] == dict(A2_KONFIG) and [tuple(x) for x in pr['par']] == GRID and pr['hinken'] == f'kuvos/{kedjan.HINKMAPP}/'
      and trana.__doc__ and '--maxfev' in text('fysik/ny_kandidat/trana.py') and "default=120" in text('fysik/ny_kandidat/trana.py'),
      'kandidatfilens procedur beskriver koden (vintrarna, kalibreringen, rättelsen, paren, hinken)')
    fo = text('docs/FORREGISTRERING-NY-KANDIDAT-2027-28.md')
    k('långvågen **alla år och alla' in fo and 'MET:s uppmätta långvåg används inte' in fo and 'räknas vinden ur komponenterna i x och y' in fo,
      'förregistreringens §1: reserven alla år, MET:s långvåg används inte, vinden ur x och y')
    return ind


# ── 2. Vinden ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def vinden(d, ind):
    r = os.path.join(d, 'xy'); vinterns_data(r, '2018-19', langvag='tom', vind='xy')
    w = tyst(las, r, '2018-19', ind, os.path.join(d, 'b'), vvis=False)
    mn = pd.concat([pd.read_csv(f, dtype={'station_id': str}) for f in sorted(glob.glob(os.path.join(r, '2018-19', 'metnordic', '*.csv.gz')))])
    fil = mn.pivot(index='tid_utc', columns='station_id', values='vind10_ms').reindex(columns=w['meta'].sid).to_numpy(float)
    t0 = list(w['idx']).index(pd.Timestamp('2018-10-31'))
    k(np.array_equal(w['F']['wind'][t0:], fil), 'kedjans vind är MET:s vind10_ms (ur x och y), inte ECMWF:s')
    ec = pd.read_csv(os.path.join(r, '2018-19', 'ifs', f'{SIDS[0]}.csv')).wind_speed_10m.to_numpy()
    k(not np.allclose(w['F']['wind'][t0:, 0], ec[t0:]), 'provet skiljer: ECMWF:s vind är en annan')
    k(w['metnordic']['klarat'] and not w['metnordic']['klarat_med_langvag'] and w['metnordic']['andel_saknad']['langvag_jm2'] == 1.0,
      f"MET-provet släpper en vinter utan långvåg men räknar den: {w['metnordic']}")
    r2 = os.path.join(d, 'tomvind'); vinterns_data(r2, '2018-19', langvag='tom', vind='tom')
    try:
        tyst(las, r2, '2018-19', ind, os.path.join(d, 'c'), vvis=False); k(False, 'en tom vindkolumn ska fälla MET-provet (annars fyller load_mn tyst med ECMWF)')
    except RuntimeError as e:
        k('MET Nordics analys täcker inte' in str(e), f'en tom vindkolumn fäller MET-provet: {e}')
    ts = text('fysik/ny_kandidat/metnordic_reserv.ts')
    k('Math.hypot(x, y)' in ts and 'VIND: Record<string, "fart" | "xy"> = { "2018-19": "xy", "2019-20": "fart", "2020-21": "fart", "2021-22": "fart", "2022-23": "fart" }' in ts,
      'hämtningen: vinden ur x och y bara 2018/19, √(x² + y²)')


# ── 3. Vecken ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def vecken(d, ind):
    alla = kedjan.enheter(kedjan.VINTRAR)
    k(len(alla) == 1 + 6 + 15 and alla[0] == {'namn': 'alla', 'trana': sorted(kedjan.VINTRAR), 'utan': []}, f'22 enheter för sex vintrar: {len(alla)}')
    for e in alla:
        k(not set(e['trana']) & set(e['utan']) and set(e['trana']) | set(e['utan']) == set(kedjan.VINTRAR), f"enheten {e['namn']} tränar på en vinter den förutsäger")
    namn = {e['namn']: e for e in alla}
    for v in kedjan.VINTRAR:
        for j, en in kedjan.parvalets_skattningar(v, kedjan.VINTRAR):
            k(j != v and en in namn and j in namn[en]['utan'] and v in namn[en]['utan'], f'parvalet i vecket {v}: {j} ur {en} har sett {j} eller {v}')
        k(len(kedjan.parvalets_skattningar(v, kedjan.VINTRAR)) == 5, f'parvalet i vecket {v} tar de fem andra vintrarna')
    k(kedjan.parvalets_skattningar('alla', kedjan.VINTRAR) == [(v, f'utan-{v}') for v in sorted(kedjan.VINTRAR)], 'den slutligas par på varje vinters eget veck')
    # Staplingen: skottåret 2019/20 (4176 timmar) bredvid 2021/22 (4152).
    rot = os.path.join(d, 'stapel')
    for v in ('2019-20', '2021-22'): vinterns_data(rot, v)
    ensam = {v: tyst(las, rot, v, ind, os.path.join(d, 'e')) for v in ('2019-20', '2021-22')}
    ihop = [copy.deepcopy(ensam[v]) for v in ('2019-20', '2021-22')]
    p = dict(DEFAULT); p.update(r_snow=0.1, albedo=0.2)
    lista = [(w['namn'], w['idx']) for w in ihop]
    F, obs, meta, idx, kol = kedjan.stapla(ihop)
    Ts, T5 = run_lw(F, p)
    common.D = ensam['2019-20']['D']
    feat, names = tyst(kedjan.sardrag, lista, F, Ts, T5, meta, kol)
    k(F['ta'].shape == (4176, 16) and len(idx) == 4176 and kol == {'2019-20': slice(0, 8), '2021-22': slice(8, 16)}, f'staplingen {F["ta"].shape} {kol}')
    for v, w in ensam.items():
        c, h = kol[v], len(w['idx'])
        Tsw, T5w = run_lw(w['F'], p)
        fw = state_features_mn(base_features_mn(w['meta'], w['idx'], w['F'], Tsw, T5w), w['F'], Tsw)
        k(np.array_equal(Ts[:h, c], Tsw) and np.array_equal(obs[:h, c], w['obs'], equal_nan=True), f'{v}: fysiken och mätningarna i staplingen = vintern ensam')
        k(list(fw) == names and all(np.array_equal(feat[n][:h, c], fw[n], equal_nan=True) for n in names),
          f'{v}: särdragen i staplingen = vintern ensam ({[n for n in names if not np.array_equal(feat[n][:h, c], fw[n], equal_nan=True)][:5]})')
        k(np.isnan(obs[h:, c]).all() and all(np.isnan(feat[n][h:, c]).all() for n in names), f'{v}: utfyllnaden har varken mätningar eller särdrag')
    k(np.isfinite(obs).sum() > 1000 and len(names) == 70, 'mätningar finns i staplingen, och kedjans 70 särdrag')
    del F, feat, Ts, T5
    # En utelämnad vinter läses utan mätningar, med samma väder.
    u = tyst(las, rot, '2021-22', ind, os.path.join(d, 'g'), vvis=False)
    k(np.isnan(u['obs']).all() and u['timtabellen'] is None and np.array_equal(u['F']['lw'], ensam['2021-22']['F']['lw']),
      'en utelämnad vinter: inga mätningar i kedjan, samma väder')
    # Talen i urvalet (den slutligas väg, tal_i_urvalet) på små matriser: per vinter och tillsammans, som common.gates.
    from sklearn.ensemble import HistGradientBoostingRegressor
    rng = np.random.default_rng(4); H, S = 60, 6
    kol2 = {'a': slice(0, 4), 'b': slice(4, 6)}
    f2 = {n: rng.normal(0, 1, (H, S)).astype(np.float32) for n in ('x', 'y')}
    Ts2 = rng.normal(0, 2, (H, S)); obs2 = Ts2 + rng.normal(0, 1.5, (H, S)); obs2[rng.random((H, S)) < 0.2] = np.nan
    m = HistGradientBoostingRegressor(max_iter=5).fit(rng.normal(0, 1, (100, 2)), rng.normal(0, 1, 100))
    u_ = kedjan.tal_i_urvalet(m, f2, ['x', 'y'], obs2, Ts2, kol2)
    P2 = Ts2 + m.predict(np.stack([f2['x'].reshape(-1), f2['y'].reshape(-1)], -1)).reshape(H, S)
    tal = lambda o, x: {kk: common.gates(o, x)[kk] for kk in ('n', 'A1', 'A2', 'A3')}
    k(u_['alla'] == {'fysik': tal(obs2, Ts2), 'fysik_rattelse': tal(obs2, P2)}
      and u_['per_vinter']['b'] == {'fysik': tal(obs2[:, 4:], Ts2[:, 4:]), 'fysik_rattelse': tal(obs2[:, 4:], P2[:, 4:])},
      f"talen i urvalet per vinter och tillsammans, som common.gates: {u_['alla']}")


# ── 4. Spärren ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
# Ett påhittat utkast med samma statusrad och signaturtabell som förregistreringen hade före signeringen (#670), så att provet inte
# beror på om repots förregistrering är signerad (den är det sedan #671).
UTKAST = ('# Förregistrering — påhittad, för självtestet\n\n**Status: UTKAST 22/10 2026** (DECISIONS #670).\n\n## 9. Signaturer\n\n'
          '| | Datum | Signatur |\n| :-- | :-- | :-- |\n| Bengt | | |\n| Axel | | |\n')


def signerad_text(status=True, bengt=True, axel=True):
    t = UTKAST
    if status: t = t.replace('**Status: UTKAST 22/10 2026**', '**Status: SIGNERAD 23/10 2026**')
    if bengt: t = t.replace('| Bengt | | |', '| Bengt | 2026-10-23 | Bengt i chatten |')
    if axel: t = t.replace('| Axel | | |', '| Axel | 2026-10-23 | Via Bengt |')
    return t


def sparren_(d):
    repot = text('docs/FORREGISTRERING-NY-KANDIDAT-2027-28.md')
    k(sparren.signerad(repot), 'förregistreringen i repot är signerad (#671)')
    t = UTKAST
    for i, (namn, x, vantat) in enumerate((('utkastet', t, False), ('statusraden utan signaturer', signerad_text(True, False, False), False),
                                           ('bara Bengt', signerad_text(True, True, False), False), ('signaturer utan statusrad', signerad_text(False, True, True), False),
                                           ('signerad', signerad_text(), True))):
        k(sparren.signerad(x) is vantat, f'spärren: {namn} → {"släpper" if not vantat else "vägrar"}')
        f = os.path.join(d, f'forreg_{i}.md'); open(f, 'w', encoding='utf-8').write(x)
        try:
            tyst(sparren.vagra_osignerad, f); k(vantat, f'vagra_osignerad släppte {namn}')
        except SystemExit as e:
            k(not vantat and e.code == 2, f'vagra_osignerad: {namn} gav {e.code}')
    # Prövningens lägen vägrar innan de läser något: sökvägarna finns inte, så allt annat än kod 2 vore en läsning.
    ns = types.SimpleNamespace(veck='2022-23', enheter=['/finns/inte'], ph='/finns/inte', vvis='/finns/inte', indata='/finns/inte', ut=d,
                               samman='/finns/inte', frysta=None)
    osign = os.path.join(d, 'forreg_0.md')                      # utkastet ovan
    gammal = os.environ.get('NYKAND_FORREG_SJALVTEST')
    os.environ['NYKAND_FORREG_SJALVTEST'] = osign
    try:
        for f_ in (provning.veck, provning.samman):
            try:
                tyst(f_, ns); k(False, f'{f_.__name__} räknade utan signerad förregistrering')
            except SystemExit as e:
                k(e.code == 2, f'{f_.__name__}: vägrar med kod 2 före läsningen, fick {e.code!r}')
    finally:
        if gammal is None: os.environ.pop('NYKAND_FORREG_SJALVTEST', None)
        else: os.environ['NYKAND_FORREG_SJALVTEST'] = gammal
    miljo = {k_: v for k_, v in os.environ.items() if k_ != 'NYKAND_FORREG_SJALVTEST'}
    p = subprocess.run([sys.executable, os.path.join(HERE, 'provning.py'), '--sparren'], capture_output=True, text=True, encoding='utf-8',
                       env={**miljo, 'NYKAND_FORREG_SJALVTEST': osign})
    k(p.returncode == 2 and 'vägrar' in p.stderr, f'provning.py --sparren mot ett utkast: {p.returncode} {p.stderr[-200:]}')
    p = subprocess.run([sys.executable, os.path.join(HERE, 'provning.py'), '--sparren'], capture_output=True, text=True, encoding='utf-8', env=miljo)
    k(p.returncode == 0, f'provning.py --sparren mot repots signerade förregistrering: {p.returncode} {p.stderr[-200:]}')


@contextlib.contextmanager
def signerad_forreg(d):
    f = os.path.join(d, 'forreg_signerad.md'); open(f, 'w', encoding='utf-8').write(signerad_text())
    gammal = provning.sparren.vagra_osignerad
    provning.sparren.vagra_osignerad = lambda fil=f: gammal(fil)
    try:
        yield f
    finally:
        provning.sparren.vagra_osignerad = gammal


# ── 5. Måtten ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def mattet(d):
    # timme():s PB bit för bit för de 15 paren, ur värdena före avrundningen.
    rng = np.random.default_rng(8)
    km = 1 / 111.2 / math.cos(math.radians(60))
    n = 30
    lon = 15 + km * rng.uniform(0, 120, n); lat = 60 + rng.uniform(0, 0.5, n)
    punkter = pd.DataFrame({'punkt': [f'P{i}' for i in range(n)], 'lon': lon, 'lat': lat, 'ph': np.round(rng.normal(0, 2, n), 2)})
    st = punkter.iloc[: n - 6].assign(yta=np.round(rng.normal(0, 2.5, n - 6), 1))[['punkt', 'yta', 'lon', 'lat']]
    with provning.utan_avrundning():
        u = timme(punkter, st, 0.25, 160.0)
    dd = dict(ra=u.ra.to_numpy(float), ph=punkter.ph.to_numpy(float), corr=u['corr'].to_numpy(float), ank=u.ank_km.to_numpy(float))
    lika = [par for par in GRID if np.array_equal(provning.pb_for(dd, *par), timme(punkter, st, *par).pb.to_numpy(float), equal_nan=True)]
    k(len(lika) == 15 and len(GRID) == 15, f'parvalets PB = timme():s PB bit för bit: {len(lika)} av {len(GRID)} par')
    k(np.round(u['corr'].to_numpy(float), 3).tolist() == timme(punkter, st, 0.25, 160.0)['corr'].tolist(), 'utan_avrundning ändrar bara avrundningen')
    k(GRID == [(w, l) for w in (0.0, 0.25, 0.5, 0.75, 1.0) for l in (40.0, 80.0, 160.0)], 'väg B:s 15 par')
    # matt.matt() oförändrad: mat_vinter med den frysta kandidatens par = matt.matt() utan något utbytt.
    lv = os.path.join(d, 'lev'); leverans(lv, '2022-23')
    v = lasare.vinter('2022-23')
    rader, _, _, _ = lasare.rader(lasare.hitta(lv, v['filer']), v['fran'], v['till'], SIDS)
    pop, _ = matt.vakter(rader)
    pos = pd.DataFrame({'sid': SIDS, 'lon': vs.LON, 'lat': vs.LAT})
    idx = pd.date_range('2022-10-10', '2023-03-31 23:00', freq='h')
    PH = luften_v(idx) - 1.0 + np.random.default_rng(3).normal(0, 1.6, (len(idx), len(SIDS)))
    ren = matt.matt(pop, pos, PH, idx, SIDS, lambda s: None)
    via = provning.mat_vinter(pop, pos, PH, idx, SIDS, (0.25, 160.0))
    k(json.dumps(ren, sort_keys=True) == json.dumps(via, sort_keys=True) and ren['population']['punkter'] > 100, 'prövningens mått är matt.matt():s')
    # De grova felen per par ur komponenterna = matt.matt() med paret (W = 0 och 1).
    rk = provning.raknat(provning.komponenter(pop, pos, PH, idx, SIDS))
    olika = []
    for par in ((0.0, 40.0), (1.0, 80.0)):
        m = provning.mat_vinter(pop, pos, PH, idx, SIDS, par)['serier']['NIVÅ 2+BLANDNING']['totalt']
        if (m['summor']['grova'], m['n']) != rk[par]: olika.append((par, (m['summor']['grova'], m['n']), rk[par]))
    k(not olika, f'grova fel per par = matt.matt():s: {olika}')
    k(len({g for g, _ in rk.values()}) > 1, f'paren skiljer sig i de påhittade datan: {rk}')
    par, tab = provning.valj_par([rk, rk])
    k(tab[par][0] == 2 * rk[par][0] and par == min(GRID, key=lambda x: rk[x][0] / rk[x][1]), f'valet: minst andel grova fel {par}')
    k(matt.par() == (0.25, 160.0), 'paret återställs efter mätningen')
    m = provning.medel_over({'a': ren['serier'], 'b': via['serier']})
    t = ren['serier']['RÅ']['totalt']
    k(m['RÅ']['totalt']['vintrar'] == 2 and abs(m['RÅ']['totalt']['A2'] - t['A2']) < 1e-15 and m['RÅ']['totalt']['n'] == 2 * t['n'],
      f"medlet över vintrarna: {m['RÅ']['totalt']}")
    k(all(x.startswith(('totalt', 'norr', 'soder', 'band ', 'månad ')) for x in m['RÅ']), f"medlets celler {list(m['RÅ'])}")


# ── 6. Hela kedjan ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
def falsk_enhet(ut, namn, utan, vintrar, mall, rng):
    """En enhet med påhittade skattningar (prövningen läser bara skattningen och dess summa)."""
    filer = []
    for v in utan:
        idx = pd.date_range(f'{v[:4]}-10-10', f'{int(v[:4]) + 1}-03-31 23:00', freq='h')
        f = os.path.join(ut, kedjan.ph_fil(namn, v))
        kedjan.spara_ph(f, luften_v(idx) - 1.2 + rng.normal(0, 1.5, (len(idx), len(SIDS))), pd.DataFrame({'sid': SIDS}), idx)
        filer.append({'fil': os.path.basename(f), 'bytes': os.path.getsize(f), 'sha256': kedjan.sha(f)})
    filer.insert(0, {'fil': kedjan.modell_fil(namn), 'bytes': 1, 'sha256': '0' * 64})
    s = copy.deepcopy(mall)
    s.update(enhet=namn, tranad_pa=[x for x in vintrar if x not in utan], utelamnade=list(utan), filer=filer)
    s.pop('i_urvalet', None)
    if not utan:
        c = {'n': 5000, 'A1': 0.5, 'A2': 0.02, 'A3': 0.001}
        s['i_urvalet'] = {'alla': {'fysik': c, 'fysik_rattelse': c}, 'per_vinter': {}}
    json.dump(s, open(os.path.join(ut, f'enhet_{namn}.json'), 'w', encoding='utf-8'), ensure_ascii=False)


def hela(d, ind):
    VI = ['2019-20', '2021-22', '2022-23']
    rot = os.path.join(d, 'rot')
    for v in VI:
        vinterns_data(rot, v, langvag='plausibel' if v == '2022-23' else 'tom')
        a = int(v[:4]); smhi(os.path.join(d, 'smhi', v), f'{a}-10-31', f'{a}-11-07')
    prov = os.path.join(d, 'prov')
    for v in VI:
        r = os.path.join(rot, v)
        ns = types.SimpleNamespace(vinter=v, indata=ind, vvis=os.path.join(r, 'vvis'), ifs=os.path.join(r, 'ifs'),
                                   metnordic=sorted(glob.glob(os.path.join(r, 'metnordic', '*.csv.gz'))), smhi=os.path.join(d, 'smhi', v),
                                   arbete=os.path.join(d, 'arb', v), ut=prov, kandidat=None, modell=None, urvalet_metnordic=None)
        rk = tyst(forbered.forbered, ns)
        s = kedjan.las_json(os.path.join(prov, f'prov_{v}.json'))
        k(rk == 0 and s['klarat'] and s['tidszon_klarat'] and s['data_klarat'] and s['prov']['smhi']['klarat'] and s['prov']['sommartid']['klarat']
          and s['prov']['metnordic']['klarat'] and s['prov']['ecmwf']['klarat'] and s['kod'] == kedjan.kodsummor(), f"förberedningen av {v}: {rk} {s.get('stopp')} {s['prov']['metnordic'].get('andel_saknad')}")
        k('Sommartidsnatten' in open(os.path.join(prov, f'prov_{v}.md'), encoding='utf-8').read(), f'förberedningens markdown för {v}')
        k(s['prov']['smhi'].get('uteslutna') == forbered.UTESLUTNA_SMHI and s['prov']['metnordic'].get('fyllt', {}).get('delar') == 0,
          f"förberedningen av {v} redovisar T1 (uteslutna SMHI-stationer) och T2 (inga fyllningslistor här)")
    # Planen: utan identitetsprovet läses ingenting; med det klarat men 2024/25:s eget prov fallet tas 2024/25 bort.
    try:
        trana.plan(trana.las_prov(prov)); k(False, 'planen gick utan identitetsprovet')
    except SystemExit as e:
        k('identitetsprovet' in str(e), f'planen utan identitetsprovet: {e}')
    def falskt_prov(v, **x):
        json.dump({'vinter': v, 'kod': kedjan.kodsummor(), 'klarat': False, 'tidszon_klarat': False, 'data_klarat': True, 'stopp': 'påhittat: SMHI föll',
                   'prov': {'identitetsprov': {'klarat': True}} if v == '2024-25' else {}, **x}, open(os.path.join(prov, f'prov_{v}.json'), 'w', encoding='utf-8'))
    falskt_prov('2024-25'); falskt_prov('2018-19')
    try:
        trana.plan(trana.las_prov(prov)); k(False, 'planen gick med en vinter utan förberedning')
    except SystemExit as e:
        k('saknas för 2020-21' in str(e), f'planen med en vinter utan förberedning stannar (ingen vinter tas bort för det): {e}')
    falskt_prov('2020-21', data_klarat=False)
    try:
        trana.plan(trana.las_prov(prov)); k(False, 'planen gick med en vinter vars indata inte räcker')
    except SystemExit as e:
        k('räcker inte' in str(e), f'planen med indata som inte räcker stannar: {e}')
    falskt_prov('2020-21')
    vintrar, borta, en = trana.plan(trana.las_prov(prov))
    k(vintrar == VI and set(borta) == {'2018-19', '2020-21', '2024-25'} and len(en) == 1 + 3 + 3,
      f'planen: tre vintrar, de tre vars tidszonsprov föll borttagna (§4): {vintrar} {borta} {len(en)}')
    kod = kedjan.kodsummor(); kod['fysik/vintrar/lasare.py'] = '0' * 64
    try:
        trana.plan(trana.las_prov(prov), kod); k(False, 'planen gick med annan läskod')
    except SystemExit as e:
        k('annan läskod' in str(e), f'planen med annan läskod: {e}')
    # Träningen: enheten i en egen rot, där bara träningsvintrarna har Trafikverkets filer.
    ut = os.path.join(d, 'ut')
    def enhet(namn, med_utelamnad=False):
        e = kedjan.enhet_av(namn, VI)
        r = os.path.join(d, 'enh', namn)
        for v in e['trana'] + e['utan']:
            for sub in ('ifs', 'metnordic') + (('vvis',) if v in e['trana'] or med_utelamnad else ()):
                shutil.copytree(os.path.join(rot, v, sub), os.path.join(r, v, sub))
        ns = types.SimpleNamespace(enhet=namn, prov=prov, indata=ind, vintrar=r, arbete=os.path.join(d, 'arbt', namn), ut=ut, maxfev=1)
        return tyst(trana.kor_enhet, ns)
    try:
        enhet('utan-2022-23', med_utelamnad=True); k(False, 'träningen gick med den utelämnade vinterns filer i jobbet')
    except SystemExit as e:
        k('vägrar' in str(e), f'träningen vägrar med den utelämnade vinterns filer: {e}')
    k(not os.path.exists(os.path.join(ut, 'enhet_utan-2022-23.json')), 'den vägrade träningen skrev ingenting')
    t = time.time()
    k(enhet('utan-2019-20_2022-23') == 0, 'enheten utan-2019-20_2022-23')
    print(f'    träningen av en enhet: {time.time() - t:.0f} s', flush=True)
    e = kedjan.las_json(os.path.join(ut, 'enhet_utan-2019-20_2022-23.json'))
    k(e['tranad_pa'] == ['2021-22'] and e['utelamnade'] == ['2019-20', '2022-23']
      and [f['fil'] for f in e['filer']] == ['modell_utan-2019-20_2022-23.pkl', 'ph_utan-2019-20_2022-23_2019-20.npz', 'ph_utan-2019-20_2022-23_2022-23.npz']
      and 'i_urvalet' not in e and len(e['sardrag']) == 70 and e['kalibrering']['maxfev'] == 1 and e['rattelse'] == dict(kedjan.A2_KONFIG)
      and set(e['indata']) == set(VI) and e['vintrar'] == VI, f"enhet_utan-2019-20_2022-23.json: {({x: e[x] for x in ('tranad_pa', 'utelamnade', 'filer')})}")
    k(e['parametrar']['cloud_p'] == DEFAULT['cloud_p'] and e['parametrar']['eps_ov'] == DEFAULT['eps_ov'], 'reservens parametrar orörda i kalibreringen')
    k(all(kedjan.sha(os.path.join(ut, f['fil'])) == f['sha256'] for f in e['filer']), 'summorna i enhetsfilen är filernas')
    PH, idx, ked = kedjan.las_ph(os.path.join(ut, 'ph_utan-2019-20_2022-23_2019-20.npz'))
    k(PH.shape == (4176, 8) and ked == SIDS and idx[0] == pd.Timestamp('2019-10-10') and np.isfinite(PH).all(), f'skattningen för 2019/20 {PH.shape}')
    # De andra enheterna med påhittade skattningar.
    rng = np.random.default_rng(12)
    for x in kedjan.enheter(VI):
        if x['namn'] != e['enhet']:
            falsk_enhet(ut, x['namn'], x['utan'], VI, e, rng)
    # Flödets plan och behov: vecken, och skattningarna varje veck hämtar ur hinken.
    enh_ = provning.las_enheter([ut])
    k(provning.plan(enh_) == VI + ['alla'] and provning.behov('2022-23', VI) == ['ph_utan-2019-20_2022-23_2019-20.npz', 'ph_utan-2021-22_2022-23_2021-22.npz',
      'ph_utan-2022-23_2022-23.npz'] and provning.behov('alla', VI) == [f'ph_utan-{v}_{v}.npz' for v in VI], 'planen och behovet för vecken')
    x = copy.deepcopy(enh_); x['utan-2021-22']['filer'] = x['utan-2021-22']['filer'][:1]
    try:
        provning.plan(x); k(False, 'planen gick med en saknad skattning')
    except SystemExit as e:
        k('saknas' in str(e), f'planen med en saknad skattning: {e}')
    # Prövningen bakom spärren, med en signerad kopia av förregistreringen.
    vv = os.path.join(d, 'vvis')
    for v in VI: shutil.copytree(os.path.join(rot, v, 'vvis'), os.path.join(vv, v))
    def veck(veck_, ph=ut, enh=ut, vvis=vv, utm=os.path.join(d, 'pr')):
        with signerad_forreg(d):
            tyst(provning.veck, types.SimpleNamespace(veck=veck_, enheter=[enh], ph=ph, vvis=vvis, indata=ind, ut=utm))
        return kedjan.las_json(os.path.join(utm, f'veck_{veck_}.json'))
    s1 = veck('2022-23')
    k(set(s1['parvalet']['vintrar']) == {'2019-20', '2021-22'} and s1['parvalet']['vintrar']['2019-20']['enhet'] == 'utan-2019-20_2022-23'
      and len(s1['parvalet']['tabell']) == 15 and s1['kandidat']['enhet'] == 'utan-2022-23' and set(s1['matt']['serier']) == set(matt.SERIER)
      and (s1['par']['W'], s1['par']['L_km']) in GRID and s1['matt']['population']['par'] == s1['par'],
      f"vecket 2022/23: parvalet på 2019/20 (den tränade enheten) och 2021/22, måtten med det valda paret {s1.get('par')}")
    # Den utelämnade vinterns mätningar och skattningar ändras: parvalet står still, måtten rör sig.
    ph2, enh2, vv2 = os.path.join(d, 'ph2'), os.path.join(d, 'enh2'), os.path.join(d, 'vvis2')
    shutil.copytree(ut, ph2); shutil.copytree(vv, vv2)
    shutil.rmtree(os.path.join(vv2, '2022-23')); leverans(os.path.join(vv2, '2022-23'), '2022-23', bias=3.0)
    for f in glob.glob(os.path.join(ph2, 'ph_*_2022-23.npz')):
        P, i_, s_ = kedjan.las_ph(f); kedjan.spara_ph(f, P + 2.5, pd.DataFrame({'sid': s_}), i_)
    def summor(mapp_enh, mapp_ph, vvis=None):
        os.makedirs(mapp_enh, exist_ok=True)
        for f in glob.glob(os.path.join(ut, 'enhet_*.json')):
            x = kedjan.las_json(f)
            for y in x['filer']:
                if os.path.exists(os.path.join(mapp_ph, y['fil'])): y['sha256'] = kedjan.sha(os.path.join(mapp_ph, y['fil']))
            if vvis:
                x['indata']['2022-23']['vvis'] = {os.path.basename(g): kedjan.sha(g) for g in lasare.hitta(os.path.join(vvis, '2022-23'), lasare.vinter('2022-23')['filer'])}
            json.dump(x, open(os.path.join(mapp_enh, os.path.basename(f)), 'w', encoding='utf-8'), ensure_ascii=False)
    summor(enh2, ph2, vv2)
    s2 = veck('2022-23', ph=ph2, enh=enh2, vvis=vv2, utm=os.path.join(d, 'pr2'))
    k(s2['par'] == s1['par'] and s2['parvalet']['tabell'] == s1['parvalet']['tabell'], 'parvalet står still när den utelämnade vinterns mätningar och skattningar ändras')
    k(s2['matt']['serier']['NIVÅ 2']['totalt'] != s1['matt']['serier']['NIVÅ 2']['totalt'], 'provet skiljer: måtten på den utelämnade vintern rör sig')
    f = os.path.join(ph2, 'ph_utan-2019-20_2022-23_2019-20.npz'); P, i_, s_ = kedjan.las_ph(f)
    kedjan.spara_ph(f, P + 2.5, pd.DataFrame({'sid': s_}), i_)
    summor(enh2, ph2, vv2)
    s3 = veck('2022-23', ph=ph2, enh=enh2, vvis=vv2, utm=os.path.join(d, 'pr3'))
    k(s3['parvalet']['tabell'] != s1['parvalet']['tabell'], 'provet skiljer: en träningsvinters skattning flyttar parvalet')
    try:
        veck('2022-23', ph=ph2, enh=ut, vvis=vv, utm=os.path.join(d, 'pr4')); k(False, 'en skattning med fel summa lästes')
    except SystemExit as e:
        k('summan' in str(e), f'en skattning med fel summa fälls: {e}')
    try:
        veck('2022-23', ph=ut, enh=ut, vvis=vv2, utm=os.path.join(d, 'pr5')); k(False, 'VViS-filer med fel summa lästes')
    except SystemExit as e:
        k('förberedningens' in str(e), f'VViS-filer som inte är förberedningens fälls: {e}')
    # Kandidatfilen i repot, när den är ifylld: en skattning med en annan summa där fälls.
    mf = os.path.join(d, 'kandidat-2027-28.json')
    json.dump({'filer': [{'fil': 'ph_utan-2019-20_2022-23_2019-20.npz', 'sha256': '0' * 64}]}, open(mf, 'w', encoding='utf-8'))
    orig = provning.manifestets_summor
    provning.manifestets_summor = lambda fil=mf: orig(fil)
    try:
        veck('2022-23', utm=os.path.join(d, 'pr6')); k(False, 'en skattning med annan summa än kandidatfilen lästes')
    except SystemExit as e:
        k('kandidat-2027-28.json' in str(e), f'en skattning med annan summa än kandidatfilen fälls: {e}')
    finally:
        provning.manifestets_summor = orig
    k(provning.manifestets_summor() == {}, 'kandidatfilen i repot har inga summor före träningen')
    # Den slutligas par och samman.
    sa = veck('alla')
    k(sa['vinter'] == 'alla' and set(sa['parvalet']['vintrar']) == set(VI) and all(sa['parvalet']['vintrar'][v]['enhet'] == f'utan-{v}' for v in VI)
      and 'matt' not in sa, 'den slutligas par: alla tre vintrarnas egna veck, inget mått')
    for v in ('2019-20', '2021-22'):              # samman räknar ur vecken; två kopior av 2022/23:s räcker för att pröva sammanslagningen
        x = copy.deepcopy(s1); x['vinter'] = v
        json.dump(x, open(os.path.join(d, 'pr', f'veck_{v}.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    with signerad_forreg(d):
        rk = tyst(provning.samman, types.SimpleNamespace(samman=os.path.join(d, 'pr'), enheter=[ut], frysta=None, ut=os.path.join(d, 'sam')))
    sm = kedjan.las_json(os.path.join(d, 'sam', 'samman.json')); kf = kedjan.las_json(os.path.join(d, 'sam', 'kandidat-2027-28.json'))
    k(rk == 0 and sm['vintrar'] == VI and set(sm['medel']) == set(matt.SERIER) and sm['ur_summorna']['vintrar'] == VI
      and sm['par']['2022-23'] == s1['par'] and sm['par']['alla'] == sa['par'], f'samman: {sm.get("vintrar")}')
    k(kf['par'] == sa['par'] and kf['beslut'] == '#670' and len(kf['sardrag']) == 70 and kf['i_urvalet']['alla']['fysik_rattelse']['n'] == 5000
      and all(set(x) == {'enhet', 'fil', 'bytes', 'sha256'} for x in kf['filer']) and kf['filer'][0]['enhet'] == 'alla'
      and kf['forregistrering']['fil'] == 'docs/FORREGISTRERING-NY-KANDIDAT-2027-28.md' and kf['procedur'] == kedjan.las_json(kedjan.MANIFEST)['procedur'],
      f"kandidatfilen: paret, särdragen, i urvalet, proceduren och summorna {kf.get('par')}")
    k(len(kf['filer']) == sum(len(kedjan.las_json(g)['filer']) for g in glob.glob(os.path.join(ut, 'enhet_*.json'))), 'kandidatfilen bär varje enhets filer')
    def langsta(x):
        return max([len(x)] + [langsta(v) for v in x]) if isinstance(x, list) else max([0] + [langsta(v) for v in x.values()]) if isinstance(x, dict) else 0
    k(langsta(sm) <= 20 and langsta(s1) <= 20, f'bara aggregat: ingen lista längre än 20 ({langsta(sm)}, {langsta(s1)})')
    md = open(os.path.join(d, 'sam', 'samman.md'), encoding='utf-8').read()
    k('Medel över vintrarna' in md and 'ur summorna' in md and 'Den slutliga kandidaten' in md, 'sammanfattningen i markdown')
    k('Jämförelsen med den frysta saknas' in md and 'jamforelse_2022_23' not in sm and sm.get('jamforelse_saknas'),
      'utan den frystas fil sägs det att jämförelsen saknas, i stället för att samman tiger (B8-25)')
    # Ersättningsregeln §2 (DECISIONS #692, B8-24): jämförelsen med den frysta bara på samma population.
    fr = {'vinter': '2022-23', 'kandidat': 'den frysta (prov)', 'matt': copy.deepcopy(s1['matt'])}
    fp = os.path.join(d, 'frysta.json')
    def samman_med_frysta(mapp):
        json.dump(fr, open(fp, 'w', encoding='utf-8'), ensure_ascii=False)
        with signerad_forreg(d):
            tyst(provning.samman, types.SimpleNamespace(samman=os.path.join(d, 'pr'), enheter=[ut], frysta=fp, ut=os.path.join(d, mapp)))
        return (kedjan.las_json(os.path.join(d, mapp, 'samman.json')).get('jamforelse_2022_23') or {},
                open(os.path.join(d, mapp, 'samman.md'), encoding='utf-8').read())
    j, md2 = samman_med_frysta('sam2')
    k(j.get('samma_population') is True and j.get('skillnader') == [] and 'Samma population' in md2
      and '| | den frysta | den nya (2022/23 utanför) |' in md2, f"samma population: jämförelsen skrivs ut ({j.get('skillnader')})")
    mn = sorted(fr['matt']['serier']['RÅ']['manad'])[0]
    fr['matt']['serier']['RÅ']['manad'][mn]['n'] += 1                     # motprovet: en punkt mer i en månad, allt annat lika
    j, md3 = samman_med_frysta('sam3')
    k(j.get('samma_population') is False and any(f'manad {mn}' in x for x in j.get('skillnader', [])) and 'gäller inte' in md3
      and '| | den frysta | den nya (2022/23 utanför) |' not in md3, f"en punkt fel i en månad fäller jämförelsen, och tabellen skrivs inte ut ({j.get('skillnader')})")
    fr['matt']['serier']['RÅ']['manad'][mn]['n'] -= 1; fr['matt']['population']['stationer'] += 1   # motprovet: en station för mycket
    j, md4 = samman_med_frysta('sam4')
    k(j.get('samma_population') is False and any(x.startswith('stationer:') for x in j.get('skillnader', [])),
      f"en station för mycket fäller jämförelsen ({j.get('skillnader')})")


def tillagget(d):
    """T1 och T2: SMHI:s station 7 bort ur listan (och provet med en station 7 vars klocka går en timme fel), fyllningens listor."""
    import tidszon
    # T1: listan. Station 7 ligger närmast VViS-stationen; med den räknas paret mot den, utan den mot nästa.
    cache = os.path.join(d, 'smhi'); os.makedirs(cache, exist_ok=True)
    lat, lon = float(vs.LAT[0]), float(vs.LON[0])
    stationer = [{'key': '7', 'name': 'Gävle', 'latitude': lat + 0.005, 'longitude': lon, 'from': 0, 'to': 2e12},
                 {'key': 107420, 'name': 'Gävle A', 'latitude': lat + 0.03, 'longitude': lon, 'from': 0, 'to': 2e12}]
    json.dump({'station': stationer}, open(os.path.join(cache, 'smhi_p1.json'), 'w', encoding='utf-8'))
    li = forbered.smhi_lista(cache)
    k([s['key'] for s in li['station']] == [107420] and forbered.UTESLUTNA_SMHI.keys() == {'7'},
      f"T1: station 7 tas ur SMHI:s lista, inget annat: {[s['key'] for s in li['station']]}")
    # Provet: VViS-luften för en station; station 7 en timme efter (stämplad i normaltid), Gävle A rätt.
    t = pd.date_range('2019-11-01', '2019-11-20', freq='h')
    L = luften_v(t)[:, 0]
    luft = pd.DataFrame({'sid': SIDS[0], 'lokal': t.tz_localize('UTC').tz_convert('Europe/Stockholm').tz_localize(None), 'luft': L})
    st = pd.DataFrame({'sid': [SIDS[0]], 'lon': [lon], 'lat': [lat]})
    def serie(nyckel, skift):
        rader = ['Datum;Tid (UTC);Lufttemperatur;Kvalitet;;Tidsutsnitt:']
        rader += [f"{(x + pd.Timedelta(hours=skift)).strftime('%Y-%m-%d;%H:%M:%S')};{L[j] + 0.05 * math.sin(3 * j):.1f};G" for j, x in enumerate(t)]
        open(os.path.join(cache, f'smhi_{nyckel}.csv'), 'w', encoding='utf-8').write('\n'.join(rader) + '\n')
    serie('7', 1); serie(107420, 0)
    fran, till = pd.Timestamp('2019-11-01').to_pydatetime(), pd.Timestamp('2019-11-20').to_pydatetime()
    utan_t1 = tidszon.provet(luft, st, fran, till, cache)
    med_t1 = tidszon.provet(luft, st, fran, till, cache, lista=li)
    k([(p['smhi'], p['bast']) for p in utan_t1['par']] == [('7', 1)] and [(p['smhi'], p['bast']) for p in med_t1['par']] == [(107420, 0)],
      f"T1: paret tas mot station 7 (topp +1 h) utan tillägget och mot Gävle A (0 h) med det: {[(p['smhi'], p['bast']) for p in utan_t1['par']]} "
      f"{[(p['smhi'], p['bast']) for p in med_t1['par']]}")
    tz = text('fysik/vintrar/tidszon.py')
    k('MAX_KM, PER_BAND, MIN_PAR = 8, 2, 5' in tz and 'klarat = len(par) >= MIN_PAR and all(p["bast"] == 0 for p in par)' in tz
      and "'7'" not in tz, 'T1: tidszon.py är orörd (regeln, avståndet och paren per band), uteslutningen ligger i forbered.py')
    k('tidszon.provet(luft, st, v[\'fran\'], v[\'till\'], a.smhi, lista=smhi_lista(a.smhi))' in text('fysik/ny_kandidat/forbered.py'),
      'T1: förberedningen ger provet den filtrerade listan')
    # T2: fyllningens listor per vinter.
    lista = lambda n, **x: {'saknade_fore': [f't{i}' for i in range(n)], 'ur_arkivet': [], 'ur_v4': [], 'saknas_i_bada': [], **x}
    f1, f2 = os.path.join(d, 'fyllt_a.json'), os.path.join(d, 'fyllt_b.json')
    json.dump(lista(3, ur_v4=['t0', 't1'], saknas_i_bada=['t2']), open(f1, 'w', encoding='utf-8'))
    json.dump(lista(1, ur_arkivet=['t0']), open(f2, 'w', encoding='utf-8'))
    su = forbered.fyllt_summa([f1, f2, os.path.join(d, 'finns_inte.json')])
    k(su == {'delar': 2, 'saknade_fore': 4, 'ur_arkivet': 1, 'ur_v4': 2, 'saknas_i_bada': 1} and forbered.fyllt_summa(None)['delar'] == 0,
      f'T2: listorna summeras per vinter, en lista som saknas räknas inte: {su}')


if __name__ == '__main__':
    print(f'prövar {", ".join(m.__file__ for m in (kedjan, provning, trana, forbered, sparren))}', flush=True)
    with tempfile.TemporaryDirectory() as d:
        _BAS['_rot'] = os.path.join(d, 'bas')
        for i in range(1, 8): os.makedirs(os.path.join(d, str(i)))
        ind = None
        for namn, steg in (('reserven', lambda: reserven(os.path.join(d, '1'))), ('vinden', lambda: vinden(os.path.join(d, '2'), ind)),
                           ('vecken', lambda: vecken(os.path.join(d, '3'), ind)), ('spärren', lambda: sparren_(os.path.join(d, '4'))),
                           ('måtten', lambda: mattet(os.path.join(d, '5'))), ('hela kedjan', lambda: hela(os.path.join(d, '6'), ind)),
                           ('tillägget', lambda: tillagget(os.path.join(d, '7')))):
            t = time.time(); r = steg()
            if namn == 'reserven': ind = r
            print(f'  {namn}: {time.time() - t:.1f} s', flush=True)
    for f_ in fel: print('✗', f_)
    if fel: sys.exit(1)
    print(f'✓ självtest ({time.time() - T0:.0f} s): långvågen alltid ur reserven (MET:s kolumn påverkar ingenting), vinden ur x och y, '
          'enheterna och staplingen (bit för bit som vintern ensam), en utelämnad vinter utan mätningar och vägran när dess filer finns, '
          'parvalet orört av den utelämnade vintern, spärren mot en osignerad förregistrering, måtten som matt.py:s och parvalet som '
          'timme():s, hela kedjan från förberedningen till kandidatfilen, och tillägget (T1: station 7 ur SMHI:s lista, T2: fyllningens listor)')
