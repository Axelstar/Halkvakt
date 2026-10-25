"""Självtestet för den nya kandidatens levande kedja (fysik/ny_kandidat/levande.py, ersättningsregeln §4), på påhittade data — ingen
rad ur Trafikverkets leverans. Körs i ci.yml.
  python fysik/ny_kandidat/sjalvtest_levande.py
Prövar, var och en med motprov:
  1. kandidaten: ladda() tar den slutliga enhetens modell med kontrollsumman och vägrar fel summa, fel scikit-learn, en kandidatfil som
     inte är ifylld (kuvos/kandidat-2027-28.json:s form före samman), den frystas kandidatfil, en flyttad reservparameter, fysik utan
     reserven och ett par utanför väg B:s 15;
  2. del A: sex timmar vid tolv punkter; utdatan är byte för byte densamma med MET:s analys- och prognoslångvåg orimlig (1e9 J/m²) eller
     tom — långvågen tas ur reserven, aldrig ur MET; fysiken är en sammanhängande körning över analys och prognos med run_lw:s egen
     reserv (facit utan kedjan.reserv_lw), och samma körning med MET:s långvåg skiljer sig (provet fäller en kedja som läser MET);
     en tom långvågskolumn räknas inte som lucka, men ett saknat dygn stoppar som i den frystas kedja;
  3. del B: blandningen med den nyas par ur kandidatfilen (exp(−10/40) vid stationen), facit för hand; den frystas del B på samma filer
     ger den frystas par (exp(−10/160)) — provet skiljer paren;
  4. pariteten: en påhittad vinter 2024/25 tränas med träningens egen kod (kedjan.trana, i urvalet) och kandidatfilen skrivs som
     samman skriver den (provning.kandidatfilen); den levande kedjan i analysläget ger då exakt talen i urvalet (KLARAT), också med
     MET:s långvåg orimlig (samma tal). Den fäller (FALLER) en kedja med en annan himmel, en annan kandidatfil i repot och tal utanför
     ± 0,01 °C / ± 0,02 pe / n, och släpper tal inom kraven; en kandidatfil i repot som inte är ifylld står bredvid och fäller inget;
  5. den frysta är orörd: den frystas del A och del B ger samma utdata (innehållets sha256) i en egen process före något av det nya som i
     den här processen efter att hela den nya kedjan körts;
  6. texten: vinden i den levande hämtningen är wind_speed_10m → vind10_ms (det den nya är tränad på), och kraven är #680:s.
"""
import contextlib, copy, gzip, hashlib, importlib.util, io, json, os, pickle, platform, subprocess, sys, tempfile, time
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
FYS = os.path.dirname(HERE)
ROT = os.path.dirname(FYS)
sys.path.insert(0, HERE)
import levande, kedjan, provning
from fysik_lw import run_lw
from prognos import skarv, las_prognos, vader, FONSTER, TIMSTEG
import kandidat_fysik as fryst_a, kandidat_timme as fryst_b


def lib(namn, rel):
    """Ett annat självtest som bibliotek för de påhittade data, ur sin egen sökväg och under eget namn (inte via sys.path)."""
    s = importlib.util.spec_from_file_location(namn, os.path.join(FYS, rel))
    m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
    return m


vs = lib('vintrar_sjalvtest_lib', os.path.join('vintrar', 'sjalvtest.py'))
nks = lib('ny_kandidat_sjalvtest_lib', os.path.join('ny_kandidat', 'sjalvtest.py'))
FRYST_KAND = json.load(open(os.path.join(ROT, 'kuvos', 'kandidat-2026-27.json'), encoding='utf-8'))
fel = []
T0 = time.time()


def k(ok, msg):
    if not ok:
        fel.append(msg)


def tyst(f, *a, **kw):
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        return f(*a, **kw)


def innehall(fil):
    """sha256 för innehållet (gzip packas upp: huvudet bär en tidsstämpel)."""
    b = open(fil, 'rb').read()
    return hashlib.sha256(gzip.decompress(b) if fil.endswith('.gz') else b).hexdigest()


def modellfil(d, n_sardrag, namn, seed=3):
    from sklearn.ensemble import HistGradientBoostingRegressor
    rng = np.random.default_rng(seed)
    m = HistGradientBoostingRegressor(max_iter=5, max_leaf_nodes=4).fit(rng.normal(0, 1, (200, n_sardrag)), rng.normal(0, 0.5, 200))
    f = os.path.join(d, namn)
    with open(f, 'wb') as fh: pickle.dump(m, fh, protocol=5)
    return f


def kandidatfil(d, namn, modell, par=(0.25, 40.0), **andra):
    """En ifylld kandidatfil i samman:s form (de fält ladda() läser), med den frystas parametrar och särdrag som påhittad kandidat."""
    import sklearn
    s = {'_om': 'påhittad', 'beslut': '#670', 'fysik': 'lw med långvågen ur fysikens reserv', 'par': {'W': par[0], 'L_km': par[1]},
         'parametrar': dict(FRYST_KAND['parametrar']), 'sardrag': list(FRYST_KAND['sardrag']),
         'filer': [{'enhet': 'alla', 'fil': 'modell_alla.pkl', 'bytes': os.path.getsize(modell), 'sha256': kedjan.sha(modell)}],
         'versioner': {'scikit-learn': sklearn.__version__}, 'i_urvalet': None}
    s.update(andra)
    f = os.path.join(d, namn)
    json.dump(s, open(f, 'w', encoding='utf-8'))
    return f


# ── Påhittad levande indata (som kandidat_fysik.py:s självtest) ───────────────────────────────────────────────────────────────────
R = pd.Timestamp('2026-11-20 06:00')
SIDS_L = [str(1000 + i) for i in range(10)] + ['v00000', 'v00001']


def levande_data(d):
    """indata (tolv punkter), 50 dygns analys i tre dagfiler och körningen R med steg 0–17; MET:s långvåg en 'kall himmel' (0,65 σT⁴),
    tydligt skild från reserven, så att en kedja som läser den syns."""
    rng = np.random.default_rng(3); ns = len(SIDS_L)
    lon = 12 + 8 * rng.random(ns); lat = 56 + 12 * rng.random(ns)
    pd.DataFrame({'sid': SIDS_L, 'lon': lon, 'lat': lat}).to_csv(f'{d}/stations.csv', index=False)
    pd.DataFrame({'sid': SIDS_L, 'elev': 100 + 300 * rng.random(ns), 'tpi1': rng.normal(0, 5, ns), 'tpi3': rng.normal(0, 10, ns)}).to_csv(f'{d}/elev.csv', index=False)
    pd.DataFrame({'sid': SIDS_L, 'Trafik_Adt_samtliga_fordon': 10 ** (2 + 2 * rng.random(ns)), 'Trafik_Adt_tunga_fordon': 50 + 500 * rng.random(ns),
                  'Vagunderhallsklass_Vagunderhallsklass': rng.integers(1, 6, ns), 'FunkVagklass_Klass': rng.integers(0, 10, ns),
                  'Vagnummer_Europavag': rng.choice(['Ja', 'Nej'], ns)}).to_csv(f'{d}/road_all.csv', index=False)
    pd.DataFrame({'sid': SIDS_L, **{c: rng.random(ns) for c in ['svf', 'horizon_south', 'tree100', 'chm30', 'water1000', 'built300']}}).to_csv(f'{d}/geofeat.csv', index=False)
    pd.DataFrame({'sid': SIDS_L, **{c: rng.normal(0, 20, ns) for c in ['tpi2km', 'tpi5km', 'tpi10km', 'tpi20km', 'vdepth5km', 'vdepth10km']}}).to_csv(f'{d}/geofeat2.csv', index=False)
    idx = pd.date_range(R - pd.Timedelta(days=50), R, freq='h'); h = np.arange(len(idx))
    rader = []
    for i, s in enumerate(SIDS_L):
        ta = -2 + 6 * np.sin(2 * np.pi * h / 24 - 1.5) + 3 * np.sin(2 * np.pi * h / (24 * 9)) + (lat[i] - 62) * -0.4 + rng.normal(0, 0.4, len(h))
        cloud = rng.random(len(h)); sw = np.maximum(0, 150 * np.sin(2 * np.pi * (h % 24) / 24 - 1.6)) * (1 - 0.7 * cloud)
        rader.append(pd.DataFrame({'station_id': s, 'tid_utc': idx.strftime('%Y-%m-%dT%H:%M:%SZ'), 't2m_c': ta, 'rh2m': 0.6 + 0.4 * rng.random(len(h)),
                                   'vind10_ms': 1 + 4 * rng.random(len(h)), 'moln': cloud, 'nederbord_mm': np.where(rng.random(len(h)) < 0.1, 0.5, 0.0),
                                   'langvag_jm2': 0.65 * 5.67e-8 * (ta + 273.15) ** 4 * 3600, 'kortvag_jm2': sw * 3600}))
    an = pd.concat(rader)
    an[an.tid_utc < '2026-11-19'].to_csv(f'{d}/a1.csv.gz', index=False, header=True)
    an[(an.tid_utc >= '2026-11-19') & (an.tid_utc < '2026-11-20')].to_csv(f'{d}/a2.csv.gz', index=False, header=False)
    an[an.tid_utc >= '2026-11-20'].to_csv(f'{d}/a3.csv.gz', index=False, header=False)
    pr = []
    for s in SIDS_L:
        for l in range(18):
            t = R + pd.Timedelta(hours=l)
            pr.append({'station_id': s, 'korning_utc': R.strftime('%Y-%m-%dT%H:%M:%SZ'), 'ledtid_h': l, 'tid_utc': t.strftime('%Y-%m-%dT%H:%M:%SZ'),
                       't2m_c': -1 + 5 * np.sin(2 * np.pi * t.hour / 24 - 1.5), 'rh2m': 0.8, 'vind10_ms': 2.0, 'moln': 0.5,
                       'nederbord_mm': np.nan if l == 0 else 0.0, 'langvag_jm2': np.nan if l == 0 else 800_000.0, 'kortvag_jm2': np.nan if l == 0 else 200_000.0})
    pd.DataFrame(pr).to_csv(f'{d}/k.csv.gz', index=False)
    return [f'{d}/a1.csv.gz', f'{d}/a2.csv.gz', f'{d}/a3.csv.gz'], f'{d}/k.csv.gz'


def skriv_om(filer, d, namn, lw, header_forst=True):
    """Kopior av analysfilerna (dagfilerna utan rubrik behålls utan) och prognosfilen med långvågen satt till lw (tal eller NaN)."""
    ut = []
    for i, f in enumerate(filer):
        utan_rubrik = i > 0 and 'k.csv' not in f
        x = pd.read_csv(f, header=None if utan_rubrik else 'infer', dtype=str if utan_rubrik else {'station_id': str})
        if utan_rubrik:
            x[7] = '' if np.isnan(lw) else str(lw)
        else:
            x['langvag_jm2'] = lw
        g = os.path.join(d, f'{namn}_{os.path.basename(f)}')
        x.to_csv(g, index=False, header=not utan_rubrik)
        ut.append(g)
    return ut


# ── 1. Kandidaten ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def kandidaten(d):
    m = modellfil(d, 70, 'modell_alla.pkl')
    kf = kandidatfil(d, 'kand.json', m)
    c = levande.ladda(kf, m)
    k(c['W'] == 0.25 and c['L'] == 40.0 and len(c['names']) == 70 and c['modell'] is not None and c['modell_sha256'] == kedjan.sha(m),
      f"ladda: paret, särdragen och modellen ur kandidatfilen: {c['W']}, {c['L']}, {len(c['names'])}")
    andra = modellfil(d, 70, 'annan.pkl', seed=4)
    tom = os.path.join(d, 'tom.json')
    json.dump(dict(json.load(open(levande.KANDIDAT, encoding='utf-8')), par=None, parametrar=None, sardrag=None, filer=[]), open(tom, 'w', encoding='utf-8'))
    fall = [('fel kontrollsumma', lambda: levande.ladda(kf, andra), RuntimeError, 'sha256'),
            ('fel scikit-learn', lambda: levande.ladda(kandidatfil(d, 'skl.json', m, versioner={'scikit-learn': '0.0'}), m), RuntimeError, 'scikit-learn'),
            ('en kandidatfil som inte är ifylld (repots form före samman)', lambda: levande.ladda(tom), ValueError, 'inte ifylld'),
            ('den frystas kandidatfil', lambda: levande.ladda(os.path.join(ROT, 'kuvos', 'kandidat-2026-27.json')), ValueError, '#670'),
            ('en flyttad reservparameter', lambda: levande.ladda(kandidatfil(d, 'cp.json', m, parametrar=dict(FRYST_KAND['parametrar'], cloud_p=1.0))), RuntimeError, 'reservens'),
            ('ett par utanför väg B', lambda: levande.ladda(kandidatfil(d, 'par.json', m, par=(0.3, 40.0))), ValueError, '15 par'),
            ('fysiken utan reserv', lambda: levande.ladda(kandidatfil(d, 'lw.json', m, fysik='lw')), ValueError, 'reserven')]
    for namn, f, typ, ord_ in fall:
        try:
            f(); k(False, f'ladda släppte {namn}')
        except typ as e:
            k(ord_ in str(e), f'ladda vägrade {namn} med fel skäl: {e}')
    return m


# ── 2. Del A ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def del_a(d, an, kr, m):
    kf = kandidatfil(d, 'kand_a.json', m)
    s, df = tyst(levande.del_a, d, an, kr, m, kf, f'{d}/ut')
    fil = s['fil']
    k(s['punkter'] == 12 and s['rader'] == 72 and s['ph_saknas'] == 0 and list(df.columns) == ['punkt', 'korning_utc', 'tid_utc', 'ts_fysik', 'ph']
      and os.path.basename(fil) == 'ny_kandidat_ph_20261120T06Z.csv.gz' and s['timmar'][0] == '2026-11-20 12:00:00' and s['timmar'][-1] == '2026-11-20 17:00:00',
      f"del A: sex timmar (R+6…R+11) × tolv punkter, den frystas kolumner: {({x: s[x] for x in ('punkter', 'rader', 'ph_saknas', 'timmar')})}")
    k(s['langvag_met_analys_lasta'] > 0 and s['langvag_met_prognos_lasta'] > 0 and s['par'] == {'W': 0.25, 'L_km': 40.0},
      f"sammanfattningen redovisar MET:s långvåg som läst men inte använd, och paret: {s['langvag_met_analys_lasta']}, {s['langvag_met_prognos_lasta']}")
    bas = innehall(fil)
    for namn, lw in (('orimlig', 1e9), ('tom', np.nan)):
        filer = skriv_om(an + [kr], d, namn, lw)
        s2, _ = tyst(levande.del_a, d, filer[:3], filer[3], m, kf, f'{d}/ut_{namn}')
        k(innehall(s2['fil']) == bas and s2['saknade_punkttimmar_ifyllda'] == s['saknade_punkttimmar_ifyllda'],
          f'del A byte för byte densamma med MET:s långvåg {namn} i analysen och prognosen (och en tom kolumn räknas inte som lucka): '
          f"{s2['saknade_punkttimmar_ifyllda']} mot {s['saknade_punkttimmar_ifyllda']}")
    # Facit utan kedjan.reserv_lw: en sammanhängande körning över analysen och prognosen med run_lw:s egen reserv (F utan 'lw').
    meta = fryst_a.las_meta(d); sids = list(meta.sid)
    korningar, A = tyst(las_prognos, [kr], sids); V, _ = vader(A)
    da = fryst_a.las_analys(an, set(sids))
    start = R - pd.Timedelta(hours=FONSTER)
    idx = pd.date_range(start, R + pd.Timedelta(hours=TIMSTEG - 1), freq='h'); hk = FONSTER
    s0, _, _ = fryst_a.snotacke_fore(da, sids, start)
    F, _ = fryst_a.bygg_F(da[(da.tid_utc >= start) & (da.tid_utc <= R)], sids, idx, R, swe0=s0)
    G, j, L, _ = skarv(F, hk, 0, V, 0, F['swe'][hk - 1])
    p = {x: float(v) for x, v in FRYST_KAND['parametrar'].items()}
    med_met, _ = run_lw(G, p)
    G_ = {x: v for x, v in G.items() if x != 'lw'}
    utan, _ = run_lw(G_, p)
    ts = df.ts_fysik.to_numpy().reshape(6, len(sids))
    dmax = float(np.max(np.abs(utan[hk + 6:hk + 12] - ts)))
    k(dmax <= 0.0051, f'fysiken = sammanhängande körning med run_lw:s egen reserv (omstarten ur tillståndet, prognosens väder): största skillnad {dmax:.4f}')
    dmet = float(np.max(np.abs(med_met[hk + 6:hk + 12] - ts)))
    k(dmet > 0.05, f'motprovet: samma körning med MET:s långvåg skiljer sig ({dmet:.3f} °C) — en kedja som läste MET hade fällts')
    # Ett saknat dygn stoppar som i den frystas kedja (MAX_IFYLLT).
    x = fryst_a.las_analys(an, set(sids))
    x = x[~((x.tid_utc >= pd.Timestamp('2026-11-01')) & (x.tid_utc < pd.Timestamp('2026-11-02')))]
    x.assign(tid_utc=x.tid_utc.dt.strftime('%Y-%m-%dT%H:%M:%SZ')).to_csv(f'{d}/a_dygn.csv.gz', index=False, header=False)
    try:
        tyst(levande.del_a, d, [f'{d}/a_dygn.csv.gz'], kr, m, kf, f'{d}/ut_dygn'); k(False, 'del A släppte igenom ett saknat dygn')
    except ValueError as e:
        k('ofullständig' in str(e), f'fel skäl för stoppet: {e}')
    try:
        tyst(levande.del_a, d, an, kr, modellfil(d, 70, 'fel.pkl', seed=9), kf, f'{d}/ut_fel'); k(False, 'del A tog en modell med fel kontrollsumma')
    except RuntimeError:
        pass
    return kf


# ── 3. Del B ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def del_b(d, kf):
    km = 1 / 111.2 / np.cos(np.radians(60))
    open(f'{d}/ph.csv', 'w').write('punkt,ph\nA,0.0\nB,0.5\nC,1.5\nv0,1.0\n')
    open(f'{d}/punkter.csv', 'w').write(f'sid,lon,lat\nA,15.0,60.0\nB,{15 + 10 * km},60.0\nC,{15 + 30 * km},60.0\nv0,15.0,60.0\n')
    open(f'{d}/ankare.csv', 'w').write(f'punkt,yta,lon,lat\nA,-1.0,15.0,60.0\nB,0.0,{15 + 10 * km},60.0\nC,2.0,{15 + 30 * km},60.0\n')
    s = tyst(levande.del_b, f'{d}/ph.csv', f'{d}/punkter.csv', f'{d}/ankare.csv', '2026-11-20T12:00:00Z', f'{d}/live.csv', kf)
    u = pd.read_csv(f'{d}/live.csv', dtype={'punkt': str}).set_index('punkt')
    # Facit för hand med talen utskrivna: vid A är A själv utesluten; B 10 km och C 30 km; den nyas par W 0,25 · L 40 km.
    w2 = np.exp(-np.array([10, 30]) / 100.0); corr_a = (w2 * np.array([-0.5, 0.5])).sum() / (w2.sum() + 0.5)
    wr2 = 1 / np.array([10, 30]); ra_a = (wr2 * np.array([0, 2])).sum() / wr2.sum()
    pb_ny = 0.25 * np.exp(-10 / 40) * ra_a + (1 - 0.25 * np.exp(-10 / 40)) * (0.0 + corr_a)
    pb_fr = 0.25 * np.exp(-10 / 160) * ra_a + (1 - 0.25 * np.exp(-10 / 160)) * (0.0 + corr_a)
    k(s['W'] == 0.25 and s['L_km'] == 40.0 and abs(u.loc['A', 'pb'] - pb_ny) <= 0.006 and u.loc['A', 'ank_km'] == 10.0
      and list(pd.read_csv(f'{d}/live.csv').columns) == ['tid_utc', 'punkt', 'ph', 'pg', 'ra', 'ank_km', 'pb', 'n_ank', 'spr'],
      f"del B: blandningen vid A med exp(−10/40): pb {u.loc['A', 'pb']} (facit {pb_ny:.3f}), den frystas kolumner")
    tyst(fryst_b.kor, f'{d}/ph.csv', f'{d}/punkter.csv', f'{d}/ankare.csv', '2026-11-20T12:00:00Z', f'{d}/live_fryst.csv')
    f = pd.read_csv(f'{d}/live_fryst.csv', dtype={'punkt': str}).set_index('punkt')
    k(abs(f.loc['A', 'pb'] - pb_fr) <= 0.006 and abs(f.loc['A', 'pb'] - u.loc['A', 'pb']) >= 0.01
      and (f[['pg', 'ra', 'ank_km', 'n_ank', 'spr']].fillna(-999) == u[['pg', 'ra', 'ank_km', 'n_ank', 'spr']].fillna(-999)).all().all(),
      f"motprovet: den frystas del B blandar med exp(−10/160) ({f.loc['A', 'pb']}, facit {pb_fr:.3f}) — samma grannar och RÅ, ett annat par")


# ── 4. Pariteten ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def pariteten(d):
    ind = os.path.join(d, 'indata'); os.makedirs(ind); vs.fasta(ind)
    nks.ecmwf_v(os.path.join(ind, 'ifs'), '2024-10-10', '2025-03-31')
    mn = os.path.join(d, 'metnordic_2024-25.csv.gz'); nks.metnordic_v([mn], '2024-10-31', '2025-03-31')
    vv = os.path.join(d, 'vvis'); vs.leverans_2024_25(vv, extra=False)
    t = time.time()
    w = tyst(kedjan.las_vinter, '2024-25', ind, os.path.join(ind, 'ifs'), [mn], os.path.join(d, 'tr'), vvis=vv)
    r = tyst(kedjan.trana, [w], maxfev=1, i_urvalet=True)
    print(f'    träningen av den påhittade slutliga enheten: {time.time() - t:.0f} s', flush=True)
    mf = os.path.join(d, 'modell_alla.pkl'); open(mf, 'wb').write(r['blob'])
    import scipy, sklearn
    enh = {'alla': {'enhet': 'alla', 'tranad_pa': ['2024-25'], 'utelamnade': [], 'vintrar': ['2024-25'], 'borttagna': {},
                    'fysik': 'lw med långvågen ur fysikens reserv', 'parametrar': {x: float(v) for x, v in r['p'].items()},
                    'kalibrering': {'utvarderingar': r['k']['evals'], 'maxfev': 1}, 'sardrag': r['names'], 'rattelse': dict(kedjan.A2_KONFIG),
                    'stationer': r['stationer'], 'timmar': r['timmar'], 'i_urvalet': r['urvalet'],
                    'versioner': {'python': platform.python_version(), 'numpy': np.__version__, 'pandas': pd.__version__, 'scipy': scipy.__version__,
                                  'scikit-learn': sklearn.__version__},
                    'filer': [{'fil': 'modell_alla.pkl', 'bytes': os.path.getsize(mf), 'sha256': kedjan.sha(mf)}]}}
    kand = provning.kandidatfilen(enh, {'par': {'W': 0.25, 'L_km': 40.0}})        # samman:s egen funktion
    kf = os.path.join(d, 'kandidat-2027-28.json'); json.dump(kand, open(kf, 'w', encoding='utf-8'), ensure_ascii=False)
    mal = kand['i_urvalet']['per_vinter']['2024-25']['fysik_rattelse']
    k(mal['n'] > 500, f'den påhittade vintern har mätningar i urvalet: n {mal["n"]}')

    def kor(namn, kandidat=kf, mn_=mn, repo=None):
        ut = os.path.join(d, 'p_' + namn)
        rc = tyst(levande.paritet, kandidat, mf, ind, vv, [mn_], os.path.join(d, 'a_' + namn), ut, repo)
        return rc, json.load(open(os.path.join(ut, 'paritet.json'), encoding='utf-8'))
    olik = copy.deepcopy(kand); olik['par'] = {'W': 0.25, 'L_km': 80.0}
    fo = os.path.join(d, 'olik.json'); json.dump(olik, open(fo, 'w', encoding='utf-8'))
    tom = os.path.join(d, 'repo_tom.json')
    json.dump(dict(json.load(open(levande.KANDIDAT, encoding='utf-8')), par=None, parametrar=None, sardrag=None, filer=[]), open(tom, 'w', encoding='utf-8'))
    rc, s = kor('bas', repo=kf)
    k(rc == 0 and s['klarat'] and s['skillnad']['n'] == 0 and abs(s['skillnad']['A1']) < 1e-12 and abs(s['skillnad']['A2']) < 1e-12
      and s['langvagen'] == {'reserven_som_traningen': True, 'met_tomd_i_filen': True} and s['kandidatfilen_i_repot'].startswith('lika'),
      f"pariteten på talen i urvalet: rc {rc}, skillnad {s['skillnad']}, långvågen {s['langvagen']}, repot {s['kandidatfilen_i_repot']}")
    md = open(os.path.join(d, 'p_bas', 'paritet.md'), encoding='utf-8').read()
    k('KLARAT' in md and '| n |' in md and 'Kandidatfilen i repot: lika' in md, 'paritetens markdown')
    # MET:s långvåg orimlig i 2024/25:s fil: samma tal (reserven). Samma körning med en annan kandidatfil i repot fälls ändå: kedjan ska
    # läsa den kandidat som prövades.
    x = pd.read_csv(mn, dtype={'station_id': str}); x['langvag_jm2'] = 1e9
    mn_orimlig = os.path.join(d, 'metnordic_orimlig.csv.gz'); x.to_csv(mn_orimlig, index=False)
    rc2, s2 = kor('orimlig', mn_=mn_orimlig, repo=fo)
    k(s2['kedjan'] == s['kedjan'] and s2['skillnad'] == s['skillnad'], f"pariteten med MET:s långvåg orimlig ger samma tal: {s2['kedjan']} mot {s['kedjan']}")
    k(rc2 == 1 and not s2['klarat'] and s2['kandidatfilen_i_repot'] == 'OLIKA i par', f"motprovet: repots kandidatfil med ett annat par fälls: {rc2} {s2['kandidatfilen_i_repot']}")
    k(levande.repo_jamfor(tom, kand).startswith('inte ifylld') and levande.repo_jamfor(None, kand).startswith('ingen'),
      'repots kandidatfil inte ifylld (som i dag) eller inte angiven står bredvid och fäller inget')
    # Motprov: en kedja med en annan himmel (90 % av reserven) fälls.
    gammal = levande.med_reserv
    levande.med_reserv = lambda F: (F.__setitem__('lw', 0.9 * kedjan.reserv_lw(F)), F)[1]
    try:
        rc3, s3 = kor('himmel')
    finally:
        levande.med_reserv = gammal
    k(rc3 == 1 and not s3['klarat'] and not s3['langvagen']['reserven_som_traningen'] and (s3['skillnad']['A1'] != 0 or s3['skillnad']['A2'] != 0),
      f"motprovet: en annan himmel fälls: {rc3} {s3['skillnad']} {s3['langvagen']}")
    # Kraven (#680) på talen: inom släpper, utanför fälls.
    g = {'n': mal['n'], 'A1': mal['A1'], 'A2': mal['A2']}
    for namn, andra, vantat in (('A2 + 0,03 pe', {'A2': mal['A2'] + 0.0003}, False), ('A2 + 0,01 pe', {'A2': mal['A2'] + 0.0001}, True),
                                ('A2 − 0,03 pe', {'A2': mal['A2'] - 0.0003}, False), ('A1 + 0,011 °C', {'A1': mal['A1'] + 0.011}, False),
                                ('A1 − 0,009 °C', {'A1': mal['A1'] - 0.009}, True), ('n + 1', {'n': mal['n'] + 1}, False)):
        ok, _ = levande.jamfor(dict(g, **andra), mal)
        k(ok is vantat, f'kraven: {namn} ska {"släppas" if vantat else "fällas"}')
    mot = copy.deepcopy(kand); mot['i_urvalet']['per_vinter']['2024-25']['fysik_rattelse']['A2'] += 0.0003
    fm = os.path.join(d, 'mot.json'); json.dump(mot, open(fm, 'w', encoding='utf-8'))
    rc7, s7 = kor('mot', kandidat=fm)
    k(rc7 == 1 and not s7['klarat'] and 'FALLER' in open(os.path.join(d, 'p_mot', 'paritet.md'), encoding='utf-8').read(),
      f'motprovet: tal i kandidatfilen 0,03 pe ifrån fälls hela vägen: {rc7}')
    k(levande.TOL_A1 == 0.01 and levande.TOL_A2 == 0.0002, 'kraven är #680:s (vinterkedja.TOL_A1, TOL_A2)')


# ── 5. Den frysta är orörd ───────────────────────────────────────────────────────────────────────────────────────────────────────
def fryst_kor(d, an, kr, ut, sub):
    """Den frystas del A och del B på samma filer, i en egen process (sub) eller i den här. → innehållets sha256 för båda."""
    kandf = os.path.join(d, 'kandidat_fryst.json')
    if sub:
        kod = (f"import sys, json; sys.path[:0] = [{os.path.join(FYS, 'live')!r}, {os.path.join(FYS, 'niva2')!r}, {FYS!r}]\n"
               f"import kandidat_fysik as a, kandidat_timme as b\n"
               f"s, _ = a.kor({d!r}, {an!r}, {kr!r}, {os.path.join(d, 'modell.pkl')!r}, {kandf!r}, {ut!r})\n"
               f"b.kor({os.path.join(d, 'ph.csv')!r}, {os.path.join(d, 'punkter.csv')!r}, {os.path.join(d, 'ankare.csv')!r}, '2026-11-20T12:00:00Z', {os.path.join(ut, 'live.csv')!r})\n"
               f"print(json.dumps({{'fil': s['fil']}}))\n")
        env = dict(os.environ, PYTHONUTF8='1')
        r = subprocess.run([sys.executable, '-X', 'utf8', '-c', kod], capture_output=True, text=True, env=env, cwd=d)
        if r.returncode:
            raise RuntimeError(f'den frystas kedja i en egen process föll: {r.stderr[-600:]}')
        fil = json.loads(r.stdout.strip().splitlines()[-1])['fil']
    else:
        s, _ = tyst(fryst_a.kor, d, an, kr, os.path.join(d, 'modell.pkl'), kandf, ut)
        tyst(fryst_b.kor, os.path.join(d, 'ph.csv'), os.path.join(d, 'punkter.csv'), os.path.join(d, 'ankare.csv'), '2026-11-20T12:00:00Z', os.path.join(ut, 'live.csv'))
        fil = s['fil']
    return innehall(fil), innehall(os.path.join(ut, 'live.csv'))


def fryst_forbered(d, an, kr):
    m = modellfil(d, 70, 'modell.pkl')
    kand = dict(FRYST_KAND, filer=[{'fil': 'modell.pkl', 'bytes': os.path.getsize(m), 'sha256': kedjan.sha(m)}])
    json.dump(kand, open(os.path.join(d, 'kandidat_fryst.json'), 'w', encoding='utf-8'))
    return fryst_kor(d, an, kr, os.path.join(d, 'fryst_fore'), sub=True)


# ── 6. Texten ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def texten():
    t = open(os.path.join(ROT, 'kuvos', 'metnordic-prognos.ts'), encoding='utf-8').read()
    k('["wind_speed_10m", "vind10_ms", false]' in t, 'den levande hämtningens vind är wind_speed_10m → vind10_ms (det den nya är tränad på)')
    l = open(os.path.join(HERE, 'levande.py'), encoding='utf-8').read()
    k('import kandidat_fysik as fryst_a' in l and 'fryst_a.bygg_F(' in l and 'fryst_b.timme(' in l and 'skarv(F, hk, a, V, 0' in l,
      'den levande kedjan läser den frystas egna funktioner, inte kopior')
    k(not any(x in l for x in ('fryst_a.bygg_F =', 'fryst_b.timme =', 'kedjan.reserv_lw =', 'prognos.skarv =')),
      'den levande kedjan skriver aldrig över den frystas funktioner')


if __name__ == '__main__':
    print('prövar ' + ', '.join(m.__file__ for m in (levande, fryst_a, fryst_b)), flush=True)
    with tempfile.TemporaryDirectory() as d:
        dk, da, db, dp = (os.path.join(d, n) for n in ('k', 'a', 'b', 'p'))
        for x in (dk, da, db, dp): os.makedirs(x)
        # Den frystas utdata FÖRE något av det nya, i en egen process, på samma filer som den nyas del A prövas på nedan.
        t = time.time()
        an, kr = levande_data(da)
        open(f'{da}/ph.csv', 'w').write('punkt,ph\n1001,0.0\nv00000,1.0\n')
        open(f'{da}/punkter.csv', 'w').write('sid,lon,lat\n1001,15.0,60.0\nv00000,15.1,60.0\n')
        open(f'{da}/ankare.csv', 'w').write('punkt,yta,lon,lat\n1001,-1.0,15.0,60.0\nB,0.0,15.2,60.0\n')
        fore = fryst_forbered(da, an, kr)
        print(f'  den frysta före, i en egen process: {time.time() - t:.1f} s', flush=True)
        t = time.time(); m = kandidaten(dk); print(f'  kandidaten: {time.time() - t:.1f} s', flush=True)
        t = time.time(); kf = del_a(da, an, kr, m); print(f'  del A: {time.time() - t:.1f} s', flush=True)
        t = time.time(); del_b(db, kf); print(f'  del B: {time.time() - t:.1f} s', flush=True)
        t = time.time(); pariteten(dp); print(f'  pariteten: {time.time() - t:.1f} s', flush=True)
        texten()
        t = time.time()
        efter = fryst_kor(da, an, kr, os.path.join(da, 'fryst_efter'), sub=False)
        k(efter == fore, f'den frystas del A och del B ger samma utdata efter den nya kedjan som före, i en egen process: {efter} mot {fore}')
        print(f'  den frysta efter, i den här processen: {time.time() - t:.1f} s', flush=True)
    for f in fel: print('✗', f)
    if fel: sys.exit(1)
    print(f'✓ självtest ({time.time() - T0:.0f} s): kandidaten ur kandidatfilen med kontrollsumman (och vägran av fel summa, fel scikit-learn, '
          'en tom eller fryst kandidatfil, en flyttad reservparameter, ett par utanför väg B), del A med långvågen ur reserven (byte för byte '
          'densamma med MET:s långvåg orimlig eller tom; facit med run_lw:s egen reserv, och motprovet med MET:s långvåg skiljer), del B med den '
          'nyas par (motprov: den frystas par), pariteten exakt på talen i urvalet med motproven (en annan himmel, repots kandidatfil, kraven '
          '± 0,01 °C / ± 0,02 pe / n), och den frystas del A och B orörda')
