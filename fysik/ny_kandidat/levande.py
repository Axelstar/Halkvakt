"""Den nya kandidatens levande kedja (ersättningsregeln docs/FORREGISTRERING-ERSATTNING-2027-28.md §4, DECISIONS #692): en egen väg
bredvid den frystas, med samma steg som fysik/live/ och bara det utbytt som skiljer de två kandidaterna. Byggd, inte påslagen.

Samma som den frysta, med den frystas kod importerad och oförändrad (fysik/live/kandidat_fysik.py, kandidat_timme.py, prognos.py):
  del A  45 dygns MET Nordic-analys fram till körningen R (las_analys, snotacke_fore, bygg_F), fysiken över analysen och omstartad vid R
         på körningens prognos (run_lw med det sparade tillståndet, prognos.skarv), kedjans särdrag och rättelsen ⇒ PH för +6 h-klassen
         R+6…R+11, samma kolumner och samma vakt (MAX_IFYLLT) som kandidat_fysik.kor;
  del B  grannarnas fel, RÅ och blandningen vid timmen (kandidat_timme.timme, replikans tal), samma kolumner som kandidat_timme.kor.
Det som skiljer (förregistreringen NY-KANDIDAT-2027-28 §1 och §3, ersättningsregeln §4):
  - KANDIDATEN ur samman:s kandidatfil (kuvos/kandidat-2027-28.json när den är ifylld; före det artefakten nykand-samman): de femton
    parametrarna, de 70 särdragen i ordning, paret och den slutliga enhetens modell modell_alla.pkl, med kontrollsumman mot filen;
  - LÅNGVÅGEN ur fysikens reserv alla timmar (med_reserv → kedjan.reserv_lw, träningens funktion): MET:s analyslångvåg ersätts med 0
    innan bygg_F (så att den varken räknas som lucka eller når fysiken), prognosens långvåg töms innan skarv, och F['lw'] skrivs över
    med reserven på det ifyllda vädret, en gång över analysen och en gång över fönstret med prognosen. Särdragen cloudlow och cloudlow6
    räknas därmed ur samma reserv som fysiken (kedja.py:114–117), som i träningen;
  - PARET W · L ur kandidatfilen (W 0,25 · L 40 km enligt DECISIONS #699) i stället för den frystas W 0,25 · L 160 km;
  - VINDEN är MET Nordics wind_speed_10m (kolumnen vind10_ms), som den levande hämtningen redan tar (kuvos/metnordic-prognos.ts FALT) och
    som den nya är tränad på 2019/20–2024/25; 2018/19 räknades den ur x och y, samma storhet (NY-KANDIDAT §1). Inget byts.

PARITETEN (ersättningsregeln §4, samma krav som DECISIONS #680): den nya kedjan i analysläget på 2024/25 ska ge den slutliga enhetens tal
i urvalet för 2024/25 (kandidatfilens i_urvalet.per_vinter['2024-25'].fysik_rattelse): n exakt, A1 ± 0,01 °C och A2 ± 0,02
procentenheter (vinterkedja.TOL_A1, TOL_A2). Vintern läses som i träningen (kedjan.las_vinter: MET:s långvåg tömd, Trafikverkets filer
ur hinken), och sedan räknar den levande kedjans egna delar: med_reserv, parametrarna, modellen och särdragsordningen ur ladda(). Det
den inte kan pröva är bygg_F och omstarten vid R — den delen är den frystas, prövad av fysik/live/paritet.py (DECISIONS #562).
Allt som lämnar paritet() är aggregat.

  python fysik/ny_kandidat/levande.py --del-a --indata <dir> --analys <filer> --korning <prognosfil> --modell modell_alla.pkl
         --kandidat <kandidat-2027-28.json> --ut <dir>
  python fysik/ny_kandidat/levande.py --del-b --ph ph.csv --punkter punkter.csv --ankare ankare.csv --tid <ISO> --kandidat <…> --ut live.csv
  python fysik/ny_kandidat/levande.py --paritet --kandidat <samman:s kandidat-2027-28.json> --modell modell_alla.pkl --indata <frusen>
         --vvis <2024/25:s fem filer> --metnordic <metnordic_2024-25.csv.gz> --arbete <dir> --ut <dir> [--repo-kandidat kuvos/kandidat-2027-28.json]
Självtestet: fysik/ny_kandidat/sjalvtest_levande.py (ci.yml).
"""
import argparse, gzip, json, os, pickle, sys, time
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kedjan                                     # sätter sökvägen till fysik/, niva2/, live/, vintrar/ och blandning/
from kedjan import common, logg, sha, lasare
from fysik_lw import run_lw
from kedja import base_features_mn, state_features_mn, gather
from prognos import skarv, las_prognos, vader, FONSTER, TIMSTEG
import kandidat_fysik as fryst_a                   # den frystas del A: läses, ändras aldrig
import kandidat_timme as fryst_b                   # den frystas del B: läses, ändras aldrig
from vinterkedja import TOL_A1, TOL_A2             # identitetsprovets krav (#680), på ett ställe
from vagb_blandning import GRID

KANDIDAT = kedjan.MANIFEST                         # kuvos/kandidat-2027-28.json
MODELL = kedjan.modell_fil('alla')                 # modell_alla.pkl, den slutliga enheten
LANGVAG = kedjan.LANGVAG


# ── Kandidaten ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def ladda(kandidatfil=KANDIDAT, modellfil=None, sha_kravs=True):
    """Kandidatfilen (samman:s kandidat-2027-28.json) och, med modellfil, modellen med kontrollsumman mot filens rad för den
    slutliga enheten och scikit-learn som modellen sparades med. Vägrar en fil som inte är ifylld eller inte är den nya kandidaten."""
    k = json.load(open(kandidatfil, encoding='utf-8'))
    if k.get('beslut') != '#670':
        raise ValueError(f"{kandidatfil}: beslut {k.get('beslut')} — väntat den nya kandidaten (#670)")
    if not (k.get('par') and k.get('parametrar') and k.get('sardrag') and k.get('filer')):
        raise ValueError(f'{kandidatfil}: kandidatfilen är inte ifylld (par, parametrar, särdrag, filer) — den skrivs ur samman-artefakten '
                         'nykand-samman (provning.py --samman)')
    if 'reserv' not in str(k.get('fysik', '')):
        raise ValueError(f"{kandidatfil}: fysiken är {k.get('fysik')!r} — den nya kandidaten räknar långvågen ur reserven")
    W, L = float(k['par']['W']), float(k['par']['L_km'])
    if (W, L) not in GRID:
        raise ValueError(f'{kandidatfil}: paret W {W} · L {L} km är inte ett av väg B:s 15 par')
    p = {x: float(v) for x, v in k['parametrar'].items()}
    kedjan.kontrollera_reserv(p)                   # reserven räknas med DEFAULT:s himmel; kalibreringen får inte ha flyttat den
    rad = next((f for f in k['filer'] if f.get('enhet', 'alla') == 'alla' and f['fil'] == MODELL), None)
    if rad is None:
        raise ValueError(f'{kandidatfil}: raden för {MODELL} saknas i filer')
    ut = dict(kand=k, p=p, names=list(k['sardrag']), W=W, L=L, modell_rad=rad, modell=None, modell_sha256=None)
    if modellfil:
        s = sha(modellfil)
        if sha_kravs and (s != rad['sha256'] or os.path.getsize(modellfil) != rad['bytes']):
            raise RuntimeError(f"{MODELL}: sha256 {s[:12]}… är inte kandidatfilens {rad['sha256'][:12]}…")
        import sklearn
        if sklearn.__version__ != k['versioner']['scikit-learn']:
            raise RuntimeError(f"scikit-learn {sklearn.__version__}, modellen är sparad med {k['versioner']['scikit-learn']} (fysik/requirements.txt)")
        with open(modellfil, 'rb') as fh:
            ut['modell'] = pickle.load(fh)
        ut['modell_sha256'] = s
    return ut


def med_reserv(F):
    """F['lw'] = himlens långvåg ur fysikens reserv på F:s eget väder (kedjan.reserv_lw, samma funktion som träningen). Det enda stället
    i den levande kedjan där långvågen sätts."""
    F['lw'] = kedjan.reserv_lw(F)
    return F


def sardragen(meta, idx, F, Ts, T5, names):
    """Kedjans särdrag (base_features_mn → state_features_mn) i rättelsens ordning; vägrar en annan ordning eller ett annat antal."""
    feat = state_features_mn(base_features_mn(meta, idx, F, Ts, T5), F, Ts)
    if list(feat) != names:
        raise RuntimeError(f'särdragen: {len(feat)} i kedjan, {len(names)} i kandidatfilen, eller i annan ordning')
    return feat


# ── Del A ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def del_a(indata, analysfiler, korningsfil, modellfil, kandidatfil, ut, sha_kravs=True):
    """kandidat_fysik.kor för den nya kandidaten: samma fönster, samma vakt och samma utdata, med kandidaten ur ladda() och långvågen ur
    reserven (med_reserv). Skriver ny_kandidat_ph_<R>.csv.gz och sammanfattning_<R>.json."""
    t0 = time.time()
    c = ladda(kandidatfil, modellfil, sha_kravs=sha_kravs)
    p, m, names = c['p'], c['modell'], c['names']
    meta = fryst_a.las_meta(indata); sids = list(meta.sid); ns = len(sids)
    korningar, A = las_prognos([korningsfil], sids)
    if len(korningar) != 1:
        raise ValueError(f'körningsfilen bär {len(korningar)} körningar, väntat en')
    R = korningar[0]
    if R.hour not in fryst_a.KORNINGAR or R.minute or R.second:
        raise ValueError(f'körningen {R} är inte en av {fryst_a.KORNINGAR} UTC — pariteten kräver kuvösens körningar')
    lw_prognos = int(np.isfinite(A[LANGVAG]).sum())
    A[LANGVAG][:] = np.nan                                             # prognosens långvåg når aldrig skarv()
    V, brus = vader(A)
    d = fryst_a.las_analys(analysfiler, set(sids))
    lw_analys = int(d[LANGVAG].notna().sum())
    d[LANGVAG] = np.where(d['t2m_c'].notna(), 0.0, np.nan)             # platshållare: bygg_F räknar luckorna i de sex fälten, inte i den
    sista = d.tid_utc.max()
    if sista < R - pd.Timedelta(hours=1):
        raise ValueError(f'analysen slutar {sista}, körningen börjar {R}: timmarna före körningen saknas')
    start = R - pd.Timedelta(hours=FONSTER)
    idx = pd.date_range(start, R + pd.Timedelta(hours=TIMSTEG - 1), freq='h')
    hk = int(np.searchsorted(idx.values, np.datetime64(R)))
    s0, snotimmar, snosaknade = fryst_a.snotacke_fore(d, sids, start)
    F, fyllda = fryst_a.bygg_F(d[(d.tid_utc >= start) & (d.tid_utc <= R)], sids, idx, min(sista, R), swe0=s0)
    med_reserv(F)
    logg(f'den nya kandidaten: {ns} punkter; analysen {idx[0]}–{idx[hk - 1]} ({hk} timmar; {fyllda} saknade punkttimmar ifyllda), körningen {R}, '
         f'långvågen ur reserven ({lw_analys} analys- och {lw_prognos} prognosvärden från MET lästa men inte använda)')
    if fyllda > fryst_a.MAX_IFYLLT * hk * ns:
        raise ValueError(f'analysen är ofullständig: {fyllda} av {hk * ns} punkttimmar ifyllda ({100 * fyllda / (hk * ns):.1f} %, taket '
                         f'{100 * fryst_a.MAX_IFYLLT:.0f} %) — kandidaten räknas inte')
    Fa = {k: (v[:hk] if isinstance(v, np.ndarray) and v.ndim == 2 else v) for k, v in F.items()}
    Ts, T5, tillstand = run_lw(Fa, p, spara=[hk - 1])
    a = max(0, hk - FONSTER)
    G, j, L, f2 = skarv(F, hk, a, V, 0, F['swe'][hk - 1])
    med_reserv(G)                                                      # reserven på prognosens väder, timme för timme
    Fh = {k: (v[j:] if isinstance(v, np.ndarray) and v.ndim == 2 else v) for k, v in G.items()}
    Tsf, T5f = run_lw(Fh, p, T_init=tillstand[hk - 1])
    Tsw = np.vstack([Ts[a:hk], Tsf]); T5w = np.vstack([T5[a:hk], T5f])
    feat = sardragen(meta, idx[a:hk + L], G, Tsw, T5w, names)
    steg = [s for s in fryst_a.LEDTID if s < L]
    rader = [j + s for s in steg]
    X = np.stack([np.asarray(feat[k][rader], np.float32).reshape(-1) for k in names], -1)
    ph = Tsf[steg] + m.predict(X).reshape(len(steg), ns)
    tider = [idx[hk + s] for s in steg]
    ut_df = pd.DataFrame({'punkt': np.tile(sids, len(steg)), 'korning_utc': R.strftime('%Y-%m-%dT%H:%M:%SZ'),
                          'tid_utc': np.repeat([t.strftime('%Y-%m-%dT%H:%M:%SZ') for t in tider], ns),
                          'ts_fysik': np.round(Tsf[steg].reshape(-1), 2), 'ph': np.round(ph.reshape(-1), 2)})
    os.makedirs(ut, exist_ok=True)
    fil = f'{ut}/ny_kandidat_ph_{R.strftime("%Y%m%dT%HZ")}.csv.gz'
    with gzip.open(fil, 'wt', newline='\n') as fh:
        ut_df.to_csv(fh, index=False)
    s = {'kandidat': 'den nya (#670), skuggan enligt ersättningsregeln §4', 'korning': str(R), 'timmar': [str(t) for t in tider],
         'punkter': ns, 'rader': int(len(ut_df)), 'analys_fran': str(idx[0]), 'analys_till': str(idx[hk - 1]), 'saknade_punkttimmar_ifyllda': fyllda,
         'snotacke_fore_timmar': snotimmar, 'snotacke_fore_saknade': snosaknade, 'snotacke_vid_start_max_mm': float(s0.max()) if len(s0) else 0.0,
         'fyllda_ur_analysen_steg0': f2, 'nederbordsbrus': brus,
         'langvag': 'fysikens reserv alla timmar (kedjan.reserv_lw); MET:s analys- och prognoslångvåg lästa men inte använda',
         'langvag_met_analys_lasta': lw_analys, 'langvag_met_prognos_lasta': lw_prognos,
         'ph_saknas': int(np.isnan(ph).sum()), 'ts_fysik_min': float(np.nanmin(Tsf[steg])), 'ts_fysik_max': float(np.nanmax(Tsf[steg])),
         'ph_min': float(np.nanmin(ph)), 'ph_max': float(np.nanmax(ph)), 'par': {'W': c['W'], 'L_km': c['L']},
         'modell_sha256': c['modell_sha256'], 'sekunder': round(time.time() - t0, 1), 'fil': fil}
    json.dump(s, open(f'{ut}/sammanfattning_{R.strftime("%Y%m%dT%HZ")}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    logg(f'klart: {len(steg)} timmar {tider[0]}–{tider[-1]} × {ns} punkter, ph {s["ph_min"]:.1f}–{s["ph_max"]:.1f} °C, '
         f'{s["ph_saknas"]} saknas, {s["sekunder"]} s → {fil}')
    return s, ut_df


# ── Del B ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def del_b(ph_csv, punkter_csv, ankare_csv, tid, ut, kandidatfil=KANDIDAT):
    """kandidat_timme.kor för den nya kandidaten: samma räkning (kandidat_timme.timme) och samma kolumner, med paret ur kandidatfilen."""
    c = ladda(kandidatfil)
    ph = pd.read_csv(ph_csv, dtype={'punkt': str})
    pos = pd.read_csv(punkter_csv, dtype={'sid': str}).rename(columns={'sid': 'punkt'})[['punkt', 'lon', 'lat']]
    ank = pd.read_csv(ankare_csv, dtype={'punkt': str})[['punkt', 'yta', 'lon', 'lat']]
    p = ph.merge(pos, on='punkt', how='inner')
    if len(p) < len(ph): print(f'  {len(ph) - len(p)} punkter med PH saknar läge i {punkter_csv} och hoppas över')
    u = fryst_b.timme(p, ank, c['W'], c['L'])
    u.insert(0, 'tid_utc', tid)
    u[['tid_utc', 'punkt', 'ph', 'pg', 'ra', 'ank_km', 'pb', 'n_ank', 'spr']].to_csv(ut, index=False)
    s = {'tid': tid, 'punkter': int(len(u)), 'ankare': int(len(ank)), 'med_ra': int(u.ra.notna().sum()), 'pb_min': float(u.pb.min()),
         'pb_max': float(u.pb.max()), 'corr_medel': float(u['corr'].mean()), 'W': c['W'], 'L_km': c['L']}
    print(f'den nya kandidaten {tid}: {s["punkter"]} punkter, {s["ankare"]} ankare, RÅ vid {s["med_ra"]}, pb {s["pb_min"]:.1f}–{s["pb_max"]:.1f} °C, '
          f'paret W {c["W"]:g} · L {c["L"]:g} km → {ut}')
    return s


# ── Pariteten ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def ph_analys(w, c):
    """Kandidatens PH i analysläget för en inläst vinter, med den levande kedjans delar: reserven, parametrarna, särdragsordningen och
    modellen ur ladda()."""
    common.D = w['D']
    F = med_reserv(w['F'])
    Ts, T5 = run_lw(F, c['p'])
    feat = sardragen(w['meta'], w['idx'], F, Ts, T5, c['names'])
    P = Ts + c['modell'].predict(gather(feat, c['names'], np.arange(len(w['meta'])))).reshape(Ts.shape)
    return P, Ts


def jamfor(g, mal):
    """Identitetsprovets dom (#680): n exakt, A1 ± TOL_A1, A2 ± TOL_A2. Returnerar (klarat, skillnaderna)."""
    d = {'n': g['n'] - mal['n'], 'A1': g['A1'] - mal['A1'], 'A2': g['A2'] - mal['A2']}
    return bool(d['n'] == 0 and abs(d['A1']) <= TOL_A1 and abs(d['A2']) <= TOL_A2), d


def repo_jamfor(repo_fil, kand):
    """Kandidatfilen i repot mot den som provet läste: tom (inte ifylld) eller lika i det kedjan läser."""
    if not repo_fil or not os.path.exists(repo_fil):
        return 'ingen kandidatfil i repot angiven'
    r = json.load(open(repo_fil, encoding='utf-8'))
    if not r.get('par'):
        return 'inte ifylld (kopiera den prövade filen dit innan skuggan räknar)'
    olika = [x for x in ('beslut', 'par', 'parametrar', 'sardrag', 'filer', 'versioner') if r.get(x) != kand.get(x)]
    return 'lika i ' + ', '.join(('beslut', 'par', 'parametrar', 'sardrag', 'filer', 'versioner')) if not olika else 'OLIKA i ' + ', '.join(olika)


def paritet(kandidatfil, modellfil, indata, vvis, metnordic, arbete, ut, repo_kandidat=None):
    """Ersättningsregeln §4: den nya kedjan i analysläget på 2024/25 mot den slutliga enhetens tal i urvalet. Utgångskod 0 = KLARAT."""
    c = ladda(kandidatfil, modellfil)
    mal = c['kand']['i_urvalet']['per_vinter'][lasare.URVALET]['fysik_rattelse']
    w = kedjan.las_vinter(lasare.URVALET, indata, os.path.join(indata, 'ifs'), metnordic, arbete, vvis=vvis)
    lw_las = w['F']['lw'].copy()
    P, Ts = ph_analys(w, c)
    samma_lw = bool(np.array_equal(lw_las, w['F']['lw'], equal_nan=True))
    utan_met = w['metnordic']['andel_saknad'][LANGVAG] == 1.0
    g, g_ts = common.gates(w['obs'], P), common.gates(w['obs'], Ts)
    tal_ok, d = jamfor(g, mal)
    r = repo_jamfor(repo_kandidat, c['kand'])
    klarat = bool(tal_ok and samma_lw and utan_met and not r.startswith('OLIKA'))     # kedjan ska läsa den kandidat som prövades
    s = {'_om': ('Ersättningsregeln §4 (DECISIONS #692): den nya kandidatens levande kedja i analysläget på 2024/25 mot den slutliga enhetens '
                 'tal i urvalet, krav som #680. Bara aggregat.'),
         'vinter': lasare.URVALET, 'kandidat': {'beslut': c['kand']['beslut'], 'par': {'W': c['W'], 'L_km': c['L']}, 'modell_sha256': c['modell_sha256'],
                                                 'parametrar': c['p']},
         'kedjan': {'n': g['n'], 'A1': round(g['A1'], 6), 'A2': round(g['A2'], 7), 'A3': round(g['A3'], 7)},
         'krav': {'n': mal['n'], 'A1': mal['A1'], 'A2': mal['A2'], 'A3': mal.get('A3'), 'tol_A1': TOL_A1, 'tol_A2': TOL_A2},
         'skillnad': {'n': d['n'], 'A1': d['A1'], 'A2': d['A2']},
         'fysik_ensam': {'n': g_ts['n'], 'A1': round(g_ts['A1'], 6), 'A2': round(g_ts['A2'], 7),
                         'kandidatfilen': c['kand']['i_urvalet']['per_vinter'][lasare.URVALET].get('fysik')},
         'langvagen': {'reserven_som_traningen': samma_lw, 'met_tomd_i_filen': utan_met},
         'stationer': w['stationer'], 'timmar': w['timmar'], 'metnordic': w['metnordic'], 'timtabellen': w['timtabellen'],
         'kandidatfilen_i_repot': r, 'klarat': klarat}
    os.makedirs(ut, exist_ok=True)
    json.dump(s, open(os.path.join(ut, 'paritet.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(os.path.join(ut, 'paritet.md'), 'w', encoding='utf-8').write(markdown(s))
    logg(f"pariteten: n {g['n']} (krav {mal['n']}), A1 {g['A1']:.5f} °C (krav {mal['A1']:.5f} ± {TOL_A1}), A2 {100 * g['A2']:.4f} % "
         f"(krav {100 * mal['A2']:.4f} ± {100 * TOL_A2:.2f} pe), reserven som träningen {samma_lw}, MET:s långvåg tömd {utan_met} → "
         f"{'KLARAT' if klarat else 'FALLER'}")
    return 0 if klarat else 1


def markdown(s):
    k, q, d = s['kedjan'], s['krav'], s['skillnad']
    pct = lambda x: f'{100 * x:.4f} %'.replace('.', ',')
    grad = lambda x: f'{x:.5f} °C'.replace('.', ',')
    return '\n'.join([
        f"## Pariteten: den nya kandidatens levande kedja på 2024/25 i analysläget (ersättningsregeln §4) → **{'KLARAT' if s['klarat'] else 'FALLER'}**", '',
        f"Krav som DECISIONS #680: n exakt, A1 ± 0,01 °C, A2 ± 0,02 pe mot den slutliga enhetens tal i urvalet (kandidatfilens "
        f"i_urvalet.per_vinter['2024-25'].fysik_rattelse). Paret W {str(s['kandidat']['par']['W']).replace('.', ',')} · L "
        f"{s['kandidat']['par']['L_km']:g} km; modell_alla.pkl {(s['kandidat']['modell_sha256'] or '')[:12]}….", '',
        '| | kedjan | kravet | skillnad |', '| :-- | --: | --: | --: |',
        f"| n | {k['n']} | {q['n']} | {d['n']} |",
        f"| A1 | {grad(k['A1'])} | {grad(q['A1'])} | {d['A1']:+.6f} °C |".replace('.', ','),
        f"| A2 | {pct(k['A2'])} | {pct(q['A2'])} | {100 * d['A2']:+.5f} pe |".replace('.', ','), '',
        f"- Långvågen: reserven bit för bit som träningens {'ja' if s['langvagen']['reserven_som_traningen'] else 'NEJ'}; "
        f"MET:s långvåg tömd i filen kedjan läser {'ja' if s['langvagen']['met_tomd_i_filen'] else 'NEJ'}.",
        f"- Fysiken ensam: A1 {grad(s['fysik_ensam']['A1'])}, A2 {pct(s['fysik_ensam']['A2'])}.",
        f"- {s['stationer']} stationer, {s['timmar']} timmar. Kandidatfilen i repot: {s['kandidatfilen_i_repot']}.", ''])


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Den nya kandidatens levande kedja (ersättningsregeln §4): del A, del B och pariteten.')
    ap.add_argument('--del-a', action='store_true'); ap.add_argument('--del-b', action='store_true'); ap.add_argument('--paritet', action='store_true')
    ap.add_argument('--indata'); ap.add_argument('--analys', nargs='+'); ap.add_argument('--korning'); ap.add_argument('--modell')
    ap.add_argument('--kandidat', default=KANDIDAT); ap.add_argument('--ut')
    ap.add_argument('--ph'); ap.add_argument('--punkter'); ap.add_argument('--ankare'); ap.add_argument('--tid')
    ap.add_argument('--vvis'); ap.add_argument('--metnordic', nargs='+'); ap.add_argument('--arbete'); ap.add_argument('--repo-kandidat')
    a = ap.parse_args()
    if a.del_a:
        for x in ('indata', 'analys', 'korning', 'modell', 'ut'):
            if not getattr(a, x): ap.error(f'--{x} krävs för --del-a')
        del_a(a.indata, a.analys, a.korning, a.modell, a.kandidat, a.ut)
    elif a.del_b:
        for x in ('ph', 'punkter', 'ankare', 'tid', 'ut'):
            if not getattr(a, x): ap.error(f'--{x} krävs för --del-b')
        del_b(a.ph, a.punkter, a.ankare, a.tid, a.ut, a.kandidat)
    elif a.paritet:
        for x in ('modell', 'indata', 'vvis', 'metnordic', 'arbete', 'ut'):
            if not getattr(a, x): ap.error(f'--{x} krävs för --paritet')
        sys.exit(paritet(a.kandidat, a.modell, a.indata, a.vvis, a.metnordic, a.arbete, a.ut, a.repo_kandidat))
    else:
        ap.error('välj --del-a, --del-b eller --paritet')
