"""Den nya kandidaten för vintern 2027/28 (förregistreringen NY-KANDIDAT-2027-28, DECISIONS #670): det som förberedningen,
träningen och prövningen delar. Den frysta kedjans kod och fysik/vintrar/ importeras oförändrade; det här är bara det som skiljer.

Långvågen ur fysikens reserv, alla år och alla timmar (§1):
  - MET Nordics kolumn langvag_jm2 töms innan filen läses (metnordic_fil), också 2022/23 och 2024/25 där den finns;
  - F['lw'] sätts till reserven, himlens emissivitet ur luft, daggpunkt och moln (physics.sky_emissivity) gånger σT⁴, räknad som
    fysik_lw.run_lw räknar sin egen reserv (lapse · elev_diff, daggpunkten högst luften). run_lw använder F['lw'] där den är ändlig,
    alltså reserven överallt, och kedja.base_features_mn räknar cloudlow/cloudlow6 ur samma F['lw'] (kedja.py:114–117);
  - reserven beror bara på cloud_p, eps_ov och lapse, som kalibreringen inte flyttar (kedja.KAL_NAMN); kontrollera_reserv() fäller
    körningen om de ändå skulle ha flyttats, så att fysiken och särdraget aldrig räknas med två olika himlar.
Vinden 2018/19 räknas ur x- och y-komponenterna redan i hämtningen (metnordic_reserv.ts), och står i filen som vind10_ms; MET-provet
här (mn_prov) kräver högst MAX_IFYLLT saknat i vind10_ms och de fem andra fälten, så att load_mn aldrig fyller tyst med ECMWF:s vind.

En vinter läses med fysik/vintrar:s väg (lasare.prep_tabell → vinterkedja.datamapp → common.load + metnordic.load_mn). En utelämnad
vinter i träningen läses UTAN Trafikverkets filer: timtabellen är tom och obs bara NaN, så att ingen rad ur den kan nå kalibreringen,
rättelsen eller parvalet (las_vinter(vvis=None)).

Flera vintrar tränas ihop som kolumner bredvid varandra (stapla): varje (vinter, station) är en kolumn, timmarna räknas från vinterns
10/10 00 UTC, och en kortare vinter fylls ut i slutet (vädret med sista timmen, obs med NaN). Fysiken och särdragen räknas kolumn för
kolumn och framåt i tiden, så utfyllnaden når aldrig en riktig timme, och raderna utan mätning väljs aldrig av kalibreringen eller
rättelsen. Särdragen räknas vinter för vinter på vinterns egna timmar (sardrag), med kedjans egna funktioner.
"""
import hashlib, itertools, json, os, sys
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
FYS = os.path.dirname(HERE)
ROT = os.path.dirname(FYS)
for _p in (os.path.join(FYS, 'blandning'), os.path.join(FYS, 'live'), FYS, os.path.join(FYS, 'niva2'), os.path.join(FYS, 'vintrar'), HERE):
    if _p not in sys.path:
        sys.path.insert(0, _p)
import common
import lasare, vinterkedja
from metnordic import load_mn, FALT
from physics import SIGMA, DEFAULT, sky_emissivity
from fysik_lw import run_lw
from kedja import base_features_mn, state_features_mn, gather, kalibrera, logg, A2_KONFIG
from kandidat_fysik import MAX_IFYLLT
import vagb
from vagb import modell_utom

VINTRAR = lasare.VINTRAR + (lasare.URVALET,)          # §2: 2018/19–2022/23 och 2024/25
# Tillägget T4 (DECISIONS #720): den rättade kandidaten tränas under egen plats i hinken och med egen kandidatfil, så att den nu
# prövade kandidatens filer står kvar orörda bredvid. NYKAND_VARIANT=t4 sätts av kuvos-ny-kandidat.yml (variant=t4).
VARIANT = os.environ.get('NYKAND_VARIANT', '')
if VARIANT not in ('', 't4'):
    raise SystemExit(f'NYKAND_VARIANT={VARIANT!r}: väntat tomt eller t4')
HINKMAPP = 'kuvos-kandidat-2027-28' + (f'-{VARIANT}' if VARIANT else '')   # hinken arkiv: kuvos/<HINKMAPP>/<fil>
MANIFEST = os.path.join(ROT, 'kuvos', 'kandidat-2027-28' + (f'-{VARIANT}' if VARIANT else '') + '.json')
HIMLEN = ('cloud_p', 'eps_ov', 'lapse')                 # allt reserven beror på utöver vädret
LANGVAG = 'langvag_jm2'
KODEN = ['fysik/common.py', 'fysik/physics.py', 'fysik/niva2/fysik_lw.py', 'fysik/niva2/kedja.py', 'fysik/niva2/metnordic.py',
         'fysik/vintrar/lasare.py', 'fysik/vintrar/tidszon.py', 'fysik/vintrar/vinterkedja.py', 'fysik/vintrar/matt.py',
         'fysik/ny_kandidat/kedjan.py']                 # koden som läser en vinter: förberedningens prov gäller bara samma kod


def sha(fil):
    h = hashlib.sha256()
    with open(fil, 'rb') as fh:
        for b in iter(lambda: fh.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def summa_mapp(mapp):
    """En summa för en mapp (ECMWF:s filer per station): sha256 över namn och sha256 för varje fil, i namnordning."""
    h = hashlib.sha256()
    for f in sorted(os.listdir(mapp)):
        h.update(f.encode() + b'\0' + sha(os.path.join(mapp, f)).encode() + b'\n')
    return h.hexdigest()


def kodsummor():
    return {f: sha(os.path.join(ROT, f)) for f in KODEN}


# ── Reserven ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def reserv_lw(F, p=None):
    """Himlens långvåg (W/m²) ur fysikens reserv, som fysik_lw.run_lw räknar den när F saknar 'lw' (rad för rad samma uttryck)."""
    q = dict(DEFAULT)
    if p: q.update(p)
    ta = F['ta'] - q['lapse'] * F['elev_diff'][None, :]
    td = np.minimum(F['td'] - q['lapse'] * F['elev_diff'][None, :], ta)
    return sky_emissivity(ta, td, F['cloud'], q) * SIGMA * (ta + 273.15) ** 4


def kontrollera_reserv(p):
    """Reserven i F['lw'] är räknad med DEFAULT:s himmel; kalibreringen får inte ha flyttat den."""
    flyttade = {k: p.get(k) for k in HIMLEN if p.get(k, DEFAULT[k]) != DEFAULT[k]}
    if flyttade:
        raise RuntimeError(f'kalibreringen flyttade reservens parametrar {flyttade} — F["lw"] är räknad med DEFAULT')


# ── En vinter ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def stationer(indata):
    return pd.read_csv(os.path.join(indata, 'stations.csv'), dtype={'sid': str})


def tom_timtabell():
    """lasare.prep_tabell:s form utan en enda rad — en utelämnad vinter läses utan mätningar."""
    return pd.DataFrame({'sid': pd.Series(dtype=str), 't': pd.Series(dtype='datetime64[ns]'),
                         **{c: pd.Series(dtype=float) for c in lasare.PREP_KOL[2:]}, 'bad': pd.Series(dtype=bool)})


def metnordic_fil(namn, delar, arbete):
    """Vinterns MET Nordic-delar till en fil som vinterkedja.kor gör den (dubbletterna bort, sorterad), med långvågens kolumn tömd."""
    if not delar:
        raise ValueError(f'{namn}: inga MET Nordic-filer')
    os.makedirs(arbete, exist_ok=True)
    mn = os.path.join(arbete, f'metnordic_reserv_{namn}.csv.gz')
    d = pd.concat([pd.read_csv(f, dtype={'station_id': str}) for f in sorted(delar)], ignore_index=True)
    d = d.drop_duplicates(['station_id', 'tid_utc']).sort_values(['station_id', 'tid_utc'])
    d[LANGVAG] = np.nan                                      # §1: MET:s uppmätta långvåg används inte, inte heller 2022/23 och 2024/25
    d.to_csv(mn, index=False)
    return mn


def mn_prov(fil, sids, fran, till):
    """vinterkedja.mn_prov över de sex fälten kedjan läser ur MET (långvågen tas ur reserven): timmarna fran 00 – till 23 UTC och
    högst MAX_IFYLLT saknat per fält. Andelen saknad långvåg står kvar i svaret men räknas inte."""
    s = vinterkedja.mn_prov(fil, sids, fran, till)
    timmar = pd.date_range(fran, pd.Timestamp(till) + pd.Timedelta(hours=23), freq='h')
    s['klarat_med_langvag'] = s.pop('klarat')
    s['klarat'] = bool(s['forsta'] == str(timmar[0]) and s['sista'] == str(timmar[-1])
                       and all(s['andel_saknad'][f] <= MAX_IFYLLT for f in FALT if f != LANGVAG))
    s['langvag'] = 'ur fysikens reserv; MET:s kolumn tömd före läsningen'
    return s


def las_vinter(namn, indata, ifs, mn_delar, arbete, vvis=None):
    """En vinter i kedjans form med långvågen ur reserven. vvis=None: en utelämnad vinter, utan Trafikverkets filer (obs bara NaN)."""
    v = lasare.vinter(namn)
    sids = stationer(indata).sid.tolist()
    if vvis is not None:
        timmar, n_prep, _ = lasare.prep_tabell(lasare.hitta(vvis, v['filer']), v['fran'], v['till'], sids)
    else:
        timmar, n_prep = tom_timtabell(), None
    mn = metnordic_fil(namn, mn_delar, arbete)
    mp = mn_prov(mn, sids, *v['metnordic'])
    if not mp['klarat']:
        raise RuntimeError(f'{namn}: MET Nordics analys täcker inte vintern (timmarna {v["metnordic"][0]} 00 – {v["metnordic"][1]} 23 UTC, '
                           f'högst {MAX_IFYLLT:.0%} saknat i de sex fälten): {mp["andel_saknad"]}')
    D = vinterkedja.datamapp(os.path.join(arbete, namn), indata, ifs, timmar)
    del timmar
    common.D = D
    meta, idx, F, obs, aux, t0 = load_mn(mn)
    del aux
    vantat = pd.date_range(v['ifs'][0], pd.Timestamp(v['ifs'][1]) + pd.Timedelta(hours=23), freq='h')
    if len(idx) != len(vantat) or (idx != vantat).any():
        raise RuntimeError(f'{namn}: ECMWF:s timindex {idx[0]} … {idx[-1]} ({len(idx)}) är inte vinterns {vantat[0]} … {vantat[-1]}')
    if len(meta) != len(sids):
        raise RuntimeError(f'{namn}: {len(meta)} stationer med ECMWF av {len(sids)} i indatan')
    if vvis is None and np.isfinite(obs).any():
        raise RuntimeError(f'{namn}: en utelämnad vinter har mätningar i kedjan')
    F['lw'] = reserv_lw(F)
    return dict(namn=namn, D=D, meta=meta, idx=idx, F=F, obs=obs, t0=str(t0), metnordic=mp, timtabellen=n_prep,
                stationer=int(len(meta)), timmar=int(len(idx)))


# ── Flera vintrar ihop ───────────────────────────────────────────────────────────────────────────────────────────────────────────
def stapla(vintrar):
    """Vintrarna som kolumner bredvid varandra. Tömmer vintrarnas F och obs (minnet). Returnerar F, obs, meta (med kolumnen vinter),
    timindexet för den längsta vintern (bara timmen på dygnet läses ur det) och kolumnerna per vinter."""
    for w in vintrar:
        if w['idx'][0] != pd.Timestamp(f"{w['namn'][:4]}-10-10") or (np.diff(w['idx'].values) != np.timedelta64(1, 'h')).any():
            raise RuntimeError(f"{w['namn']}: timindexet börjar inte 10/10 00 UTC eller har hål")
    H = max(len(w['idx']) for w in vintrar)
    lang = next(w for w in vintrar if len(w['idx']) == H)
    nycklar = list(vintrar[0]['F'])
    if any(list(w['F']) != nycklar for w in vintrar):
        raise RuntimeError('vintrarnas väder har olika fält')

    def fyll(a, med_nan):
        h = a.shape[0]
        if h == H:
            return a
        return np.vstack([a, np.full((H - h, a.shape[1]), np.nan) if med_nan else np.repeat(a[-1:], H - h, axis=0)])
    kol, c = {}, 0
    for w in vintrar:
        n = w['F']['ta'].shape[1]; kol[w['namn']] = slice(c, c + n); c += n
    F = {}
    for k in nycklar:
        if np.ndim(vintrar[0]['F'][k]) == 2:
            F[k] = np.hstack([fyll(w['F'][k], False) for w in vintrar])
        else:
            F[k] = np.concatenate([np.asarray(w['F'][k]) for w in vintrar])
        for w in vintrar:
            w['F'][k] = None
    obs = np.hstack([fyll(w['obs'], True) for w in vintrar])
    for w in vintrar:
        w['obs'] = None
    meta = pd.concat([w['meta'].assign(vinter=w['namn']) for w in vintrar], ignore_index=True)
    return F, obs, meta, lang['idx'], kol


def sardrag(vintrar, F, Ts, T5, meta, kol):
    """Kedjans särdrag (base_features_mn → state_features_mn) vinter för vinter på vinterns egna timmar, in i gemensamma matriser
    (timmar × alla kolumner, float32; utfyllnaden NaN). vintrar: [(namn, idx)]."""
    H, S = Ts.shape
    feat, names = None, None
    for namn, idx in vintrar:
        c = kol[namn]; h = len(idx)
        Fw = {k: (v[:h, c] if np.ndim(v) == 2 else v[c]) for k, v in F.items()}
        fw = state_features_mn(base_features_mn(meta.iloc[c].reset_index(drop=True), idx, Fw, Ts[:h, c], T5[:h, c]), Fw, Ts[:h, c])
        if feat is None:
            names = list(fw)
            feat = {k: np.full((H, S), np.nan, np.float32) for k in names}
        if list(fw) != names:
            raise RuntimeError(f'{namn}: särdragen i annan ordning')
        for k in names:
            feat[k][:h, c] = fw[k]
        del fw, Fw
    return feat, names


def trana(vintrar, maxfev=120, konfig=A2_KONFIG, i_urvalet=False):
    """Den frysta procedurens (a) och (b) (fysik/niva2/frysta.py frys()) på alla stationer i vintrarna ihop: kalibrera från
    vagb.DEFAULT (Nelder–Mead, A1 + 5·A2, maxfev), fysiken med parametrarna, särdragen, och en rättelse med konfig (A2_KONFIG) på alla
    kolumner. i_urvalet=True räknar också kedjans egna tal på vintrarna den tränade på (som frysta.py:s i_urvalet)."""
    import kedja
    if kedja.run_lw is not run_lw or vagb.run_lw is not run_lw:              # som frysta.py: fysiken 'lw', aldrig terrängens koppling
        raise RuntimeError("kedjan är kopplad till en annan fysik än 'lw' i den här processen")
    lista = [(w['namn'], w['idx']) for w in vintrar]
    common.D = vintrar[0]['D']                               # base_features_mn läser road_all/geofeat ur common.D (samma i alla)
    F, obs, meta, idx, kol = stapla(vintrar)
    ns = F['ta'].shape[1]
    alla = np.zeros(ns, int)
    logg(f"träningen: {len(lista)} vintrar ({', '.join(n for n, _ in lista)}), {ns} kolumner, {F['ta'].shape[0]} timmar")
    p, k = kalibrera(F, obs, alla, dict(vagb.DEFAULT), maxfev)
    kontrollera_reserv(p)
    logg(f"kalibrerat efter {k['evals']} utvärderingar på {k['train']['n']} timmar: A1 {k['train']['A1']:.3f} °C, A2 {100 * k['train']['A2']:.2f} % (träningsvintrarna)")
    Ts, T5 = run_lw(F, p)
    feat, names = sardrag(lista, F, Ts, T5, meta, kol)
    del F, T5
    m = modell_utom(feat, names, obs, Ts, alla, -1, **konfig)
    logg(f'rättelsen tränad: {len(names)} särdrag')
    # Som frysta.py: modellen picklad (protokoll 5) och läst tillbaka ska ge samma rättelse på var 97:e timme.
    import pickle
    blob = pickle.dumps(m, protocol=5)
    rad = np.arange(0, Ts.shape[0], 97)
    X = gather({n: feat[n][rad] for n in names}, names, np.arange(ns))
    if not np.array_equal(pickle.loads(blob).predict(X), m.predict(X)):
        raise RuntimeError('modellen picklad och läst tillbaka ger inte samma rättelse som modellen i minnet')
    del X
    urvalet = tal_i_urvalet(m, feat, names, obs, Ts, kol) if i_urvalet else None
    del feat
    return dict(p=p, k=k, names=names, modell=m, blob=blob, urvalet=urvalet, kolumner=ns, timmar=int(Ts.shape[0]),
                stationer={n: int(kol[n].stop - kol[n].start) for n, _ in lista})


def tal_i_urvalet(m, feat, names, obs, Ts, kol):
    """Som frysta.py:s i_urvalet: kedjans egna tal (common.gates, timvis) för fysiken och fysiken med rättelsen, på vintrarna
    proceduren tränade på — per vinter och tillsammans. Rättelsen räknas vinter för vinter (minnet)."""
    P = np.full_like(Ts, np.nan)
    for c in kol.values():
        cols = np.arange(c.start, c.stop)
        P[:, c] = Ts[:, c] + m.predict(gather(feat, names, cols)).reshape(Ts.shape[0], len(cols))
    def tal(o, x):
        g = common.gates(o, x)
        return {kk: g[kk] for kk in ('n', 'A1', 'A2', 'A3')}
    return {'_om': 'Kedjans egna tal (common.gates, timvis) på vintrarna proceduren tränade på — i urvalet, inte det väntade felet.',
            'alla': {'fysik': tal(obs, Ts), 'fysik_rattelse': tal(obs, P)},
            'per_vinter': {n: {'fysik': tal(obs[:, c], Ts[:, c]), 'fysik_rattelse': tal(obs[:, c], P[:, c])} for n, c in kol.items()}}


def prediktera(w, p, m, names):
    """Kandidatens timvärden PH för en vinter (vinterkedja.kandidaten:s räkning: fysiken med p, särdragen, P = Ts + m.predict)."""
    common.D = w['D']
    F = w['F']
    Ts, T5 = run_lw(F, p)
    feat = state_features_mn(base_features_mn(w['meta'], w['idx'], F, Ts, T5), F, Ts)
    if list(feat) != names:
        raise RuntimeError(f"{w['namn']}: särdragen skiljer sig från rättelsens")
    return Ts + m.predict(gather(feat, names, np.arange(len(w['meta'])))).reshape(Ts.shape)


def spara_ph(fil, P, meta, idx):
    np.savez_compressed(fil, ph=np.asarray(P, np.float64), sid=np.asarray(meta.sid, dtype=str),
                        t=pd.DatetimeIndex(idx).values.astype('datetime64[s]').astype('int64'))


def las_ph(fil):
    z = np.load(fil, allow_pickle=False)
    return z['ph'], pd.to_datetime(z['t'], unit='s'), [str(s) for s in z['sid']]


# ── Enheterna: vad varje träningsjobb tränar på och förutsäger ───────────────────────────────────────────────────────────────────
def enhetsnamn(utan):
    return 'alla' if not utan else 'utan-' + '_'.join(sorted(utan))


def enheter(vintrar):
    """Den slutliga (alla vintrar), ett veck per vinter (de andra tränar, vintern förutsägs: provet i §3) och ett parveck per par av
    vintrar (de övriga tränar, båda förutsägs: de ärliga skattningarna som paret väljs på i veck k, där varje träningsvinter j
    skattas av en modell som varken sett j eller k). Ingen enhet tränar på en vinter den förutsäger."""
    v = sorted(vintrar)
    ut = [dict(namn='alla', trana=v, utan=[])]
    ut += [dict(namn=enhetsnamn([k]), trana=[x for x in v if x != k], utan=[k]) for k in v]
    ut += [dict(namn=enhetsnamn([j, k]), trana=[x for x in v if x not in (j, k)], utan=[j, k]) for j, k in itertools.combinations(v, 2)]
    return ut


def enhet_av(namn, vintrar):
    e = next((x for x in enheter(vintrar) if x['namn'] == namn), None)
    if e is None:
        raise ValueError(f'enheten {namn!r} finns inte för vintrarna {sorted(vintrar)}')
    return e


def modell_fil(enhet):
    return f'modell_{enhet}.pkl'


def ph_fil(enhet, vinter):
    return f'ph_{enhet}_{vinter}.npz'


def parvalets_skattningar(veck, vintrar):
    """Vilken enhets skattning av vilken vinter paret väljs på. veck = en vinter k: varje träningsvinter j ≠ k ur parvecket utan j och
    k. veck = 'alla' (den slutliga): varje vinter ur sitt eget veck (de sex ärliga skattningarna, som väg B:s 'på alla veck', #544)."""
    if veck == 'alla':
        return [(j, enhetsnamn([j])) for j in sorted(vintrar)]
    if veck not in vintrar:
        raise ValueError(f'vecket {veck!r} är ingen av vintrarna {sorted(vintrar)}')
    return [(j, enhetsnamn([j, veck])) for j in sorted(vintrar) if j != veck]


def las_json(fil):
    return json.load(open(fil, encoding='utf-8'))
