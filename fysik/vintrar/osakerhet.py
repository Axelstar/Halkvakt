"""Osäkerheten i jämförelsen på 2022/23 (DECISIONS #707): den låsta kandidaten mot den nyas veck utan 2022/23, NIVÅ 2+BLANDNING på
grind A:s population, med omdragning av hela stationer och hela dygn. DIAGNOS: ändrar ingen dom och inget krav (regel L); underlag
för bytesbeslutet (FORREGISTRERING-2026-27 §12 b) och valet inför 2027/28 (§12 g).

Metoden är skriven före räkningen (#707):
  - DEN LÅSTA räknas med sin egen vinterkedja, oförändrad: fysik/vintrar/vinterkedja.py kor() med identitetsprovet på 2024/25,
    tidszonen och vintern, som kuvos-vintrar.yml. Skriptet fångar bara kedjans PH och population på vägen in i måtten (mattet()) och
    rör ingen fil i KODEN (fysik/ny_kandidat/kedjan.py) eller i fysik/SHA256SUMS.
  - DEN NYA är vecket utan 2022/23: dess PH ur hinken (ph_utan-2022-23_2022-23.npz, summan mot kuvos/kandidat-2027-28.json) med vecket
    valda paret W 0,25 · L 40 km, på SAMMA population (samma pop som den låstas kedja byggde).
  - PUNKTERNA är matt.matt():s: grind A:s population där RÅ, PH och PB har värde, och PB ur matt.blandning() med respektive par.
    IDENTITETEN: båda kandidaternas summor (n, nDec, grova fel, fel sida, absoluta fel) ska vara exakt samman:s (40024563991, #702),
    och de två punktmängderna ska vara desamma med samma mätta yta. Annars stoppar skriptet innan något dras om.
  - CELLERNA är station × UTC-dygn, med summorna per kandidat. Inga celler och inga punkter lämnar jobbet; bara aggregat skrivs.
  - OMDRAGNINGEN: B = 2000 per schema, fröet 20261024: (S) stationer med återläggning, (D) dygn med återläggning, och (SD) båda
    oberoende, där cellens vikt är stationens antal gånger dygnets antal. SD är huvudschemat.
  - TALEN: ΔA2 = A2(den nya) − A2(den låsta) totalt (huvudtalet), i norr (≥ 62°) och i söder; ΔA1 där mätt yta ≥ −5; ΔA3. Intervallet
    är 2,5–97,5 % av omdragningarna, och andelen omdragningar där Δ ≥ 0 skrivs ut. Bredvid står det naiva parade standardfelet
    (punkterna som oberoende) och dess intervall ± 1,96 · fel.
  - LÄSNINGEN: förbättringen i A2 går att skilja från noll om hela SD-intervallet för ΔA2 totalt ligger under 0.

NIVÅERNA (DECISIONS #708, skrivet före körningen, inför valet av variant för FORREGISTRERING-2026-27 §4b punkt 12):
  - Samma celler, samma tre scheman och samma vikter (samma frö, så att omdragningarna är desamma som för skillnaden): A1, A2 och A3 för
    var och en av kandidaterna, totalt, i norr och i söder, och per ankarband (grind A:s band ur matt.BANDS, punktens ank_km), där
    varje band dras om för sig på sina egna stationer och dygn.
  - Bredvid varje nivå står marginalvaktens intervall (punkttalet ± 1,96 · det naiva felet, som matt.stats), och om SD-intervallet når
    över grind A:s tröskel (TROSKLAR-SKUGGAN §3: A1 ≤ 1,0 °C, A2 ≤ 5 %, A3 ≤ 10 %).
  - Diagnos: den låstas tal på 2022/23 är redan sedda (#680), och ingenting ändras av dem. Svaret är hur brett ett ärligt intervall för en
    nivå blir, så att variant A och B kan väljas med kunskap om vad de betyder.

TILLÄGGETS VINTRAR 2018/19–2021/22 (utkastet till tillägget till FLER-VINTRAR, DECISIONS #711), skrivet före körningen:
  - Samma metod, med vintern som parameter: den låsta räknas med sin vinterkedja (med tillägget: spärren, långvågen ur v4 och
    tidszonsprovet utan station 7, vinterkedja.py), och den nya är vecket utan vintern (ph_utan-<v>_<v>.npz) med vecket valda par.
  - IDENTITETEN: den låstas punkter ska ge exakt de summor som dess egen kedja skrev i samma körning (fryst/kuvos-vintrar-<v>.json), och
    den nyas exakt samman:s för vintern (per_vinter). Populationerna ska vara desamma (provning.skilda_populationer, ersättningsregeln
    §2, som samman prövar 2022/23), och punktmängderna lika. Annars stoppar skriptet innan något dras om.
  - FRÖET är 20261025 (utkastet till tillägget). 2022/23 räknas med 20261024 som förut, så att #707 och #708 går att räkna om.

  python fysik/vintrar/osakerhet.py --sjalvtest
  python fysik/vintrar/osakerhet.py <vinterkedja.py:s argument för vintern> --ny-ph <ph_utan-<v>_<v>.npz> --samman <samman.json>
"""
import argparse, contextlib, json, math, os, sys
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
FYS = os.path.dirname(HERE)
VINTER = '2022-23'
B, FRO, Z = 2000, 20261024, 1.96
VINTRAR_V4 = ('2018-19', '2019-20', '2020-21', '2021-22')                       # tillägget till FLER-VINTRAR (DECISIONS #711)
FRO_V4 = 20261025                                                                # fröet i utkastet till tillägget


def fro_for(vinter):
    """Fröet för vintern: 2022/23 som #707 och #708, tilläggets vintrar med tilläggets frö."""
    if vinter == VINTER:
        return FRO
    if vinter in VINTRAR_V4:
        return FRO_V4
    raise ValueError(f'vintern {vinter}: väntat {VINTER} eller en av {", ".join(VINTRAR_V4)}')
NORR_LAT = 62
NY_PAR = (0.25, 40.0)
SERIE = 'NIVÅ 2+BLANDNING'
DYGN_S, BUCKET_S = 86400, 1800
SUMMOR = ('grova', 'fel_sida', 'abs_dec')


def logg(s):
    print(s, flush=True)


# ── Omdragningen (testbar utan data) ─────────────────────────────────────────────────────────────────────────────────────────────
def celler(sid, b, norr, meas, pb_f, pb_n):
    """Station × UTC-dygn: matriserna (stationer × dygn) för varje summa, och stationernas norr-flagga."""
    meas = np.asarray(meas, float); dec = meas >= -5
    ef, en = np.asarray(pb_f, float) - meas, np.asarray(pb_n, float) - meas
    fs = lambda p: ((meas < 0) & (p > 2)) | ((meas > 2) & (p < 0))
    df = pd.DataFrame({'sid': np.asarray(sid, dtype=object), 'dag': (np.asarray(b, np.int64) * BUCKET_S) // DYGN_S,
                       'n': 1, 'nd': dec.astype(int), 'gf': (np.abs(ef) > 2).astype(int), 'gn': (np.abs(en) > 2).astype(int),
                       'sf': fs(pb_f).astype(int), 'sn': fs(pb_n).astype(int),
                       'af': np.where(dec, np.abs(ef), 0.0), 'an': np.where(dec, np.abs(en), 0.0)})
    st = sorted(df.sid.unique()); dg = sorted(df.dag.unique())
    si = df.sid.map({s: i for i, s in enumerate(st)}).to_numpy(); di = df.dag.map({d: i for i, d in enumerate(dg)}).to_numpy()
    X = {}
    for k in ('n', 'nd', 'gf', 'gn', 'sf', 'sn', 'af', 'an'):
        m = np.zeros((len(st), len(dg))); np.add.at(m, (si, di), df[k].to_numpy(float)); X[k] = m
    norr_st = pd.Series(np.asarray(norr, bool), index=df.sid).groupby(level=0).first().reindex(st).to_numpy(bool)
    return X, norr_st, st, dg


def deltan(X, ws, wd, mask=None):
    """Δ för viktade stationer (B × S) och dygn (B × D): ΔA2, ΔA1, ΔA3 per omdragning."""
    ws = ws if mask is None else ws * mask[None, :]
    s = lambda k: ((ws @ X[k]) * wd).sum(1)
    n, nd = s('n'), s('nd')
    with np.errstate(invalid='ignore', divide='ignore'):
        return {'A2': (s('gn') - s('gf')) / n, 'A1': (s('an') - s('af')) / nd, 'A3': (s('sn') - s('sf')) / n}


def vikter(rng, antal, b):
    """b omdragningar med återläggning av antal enheter → antal gånger varje enhet drogs (b × antal)."""
    w = np.zeros((b, antal))
    idx = rng.integers(0, antal, size=(b, antal))
    np.add.at(w, (np.repeat(np.arange(b), antal), idx.ravel()), 1.0)
    return w


def omdragning(X, norr_st, b=B, fro=FRO):
    """De tre schemana. Returnerar {schema: {tal: {'intervall': [lo, hi], 'andel_ge_0': x}}}."""
    S, D = X['n'].shape
    rng = np.random.default_rng(fro)
    ett_s, ett_d = np.ones((b, S)), np.ones((b, D))
    ws, wd = vikter(rng, S, b), vikter(rng, D, b)
    ut = {}
    for namn, (a, c) in {'S': (ws, ett_d), 'D': (ett_s, wd), 'SD': (ws, wd)}.items():
        res = {}
        for del_, mask in (('totalt', None), ('norr', norr_st.astype(float)), ('soder', (~norr_st).astype(float))):
            d = deltan(X, a, c, mask)
            for tal in (('A2', 'A1', 'A3') if del_ == 'totalt' else ('A2',)):
                v = d[tal][np.isfinite(d[tal])]
                res[f'{tal}_{del_}'] = {'intervall': [float(np.quantile(v, 0.025)), float(np.quantile(v, 0.975))],
                                        'andel_ge_0': float((v >= 0).mean()), 'omdragningar': int(v.size)}
        ut[namn] = res
    return ut


def punkttal(X, norr_st):
    """Δ på hela populationen, utan omdragning."""
    S, D = X['n'].shape
    ut = {}
    for del_, mask in (('totalt', None), ('norr', norr_st.astype(float)), ('soder', (~norr_st).astype(float))):
        d = deltan(X, np.ones((1, S)), np.ones((1, D)), mask)
        for tal in (('A2', 'A1', 'A3') if del_ == 'totalt' else ('A2',)):
            ut[f'{tal}_{del_}'] = float(d[tal][0])
    return ut


def naivt(meas, pb_f, pb_n):
    """Det parade standardfelet för ΔA2 med punkterna som oberoende: d = grov(ny) − grov(låst) ∈ {−1, 0, 1}."""
    meas = np.asarray(meas, float)
    d = (np.abs(np.asarray(pb_n) - meas) > 2).astype(float) - (np.abs(np.asarray(pb_f) - meas) > 2).astype(float)
    m = float(d.mean()); se = float(math.sqrt(max(float((d * d).mean()) - m * m, 0.0) / d.size))
    return {'dA2': m, 'fel': se, 'intervall': [m - Z * se, m + Z * se]}


TROSKEL = {'A1': 1.0, 'A2': 0.05, 'A3': 0.10}                                      # TROSKLAR-SKUGGAN §3, grind A
BANDS = [('0–7 km', 0, 7), ('7–15 km', 7, 15), ('15–20 km', 15, 20), ('>20 km', 20, math.inf)]   # matt.BANDS (grind-a.ts)


def niva(X, ws, wd, kand, mask=None):
    """Nivån för en kandidat ('f' den låsta, 'n' den nya) per omdragning: A2, A1, A3."""
    ws = ws if mask is None else ws * mask[None, :]
    s = lambda k: ((ws @ X[k]) * wd).sum(1)
    n, nd = s('n'), s('nd')
    with np.errstate(invalid='ignore', divide='ignore'):
        return {'A2': s('g' + kand) / n, 'A1': s('a' + kand) / nd, 'A3': s('s' + kand) / n}


def marginalvakt(X, kand, mask=None):
    """Punkttalet och marginalvaktens intervall (± 1,96 · det naiva felet, som matt.stats och publish/marginal.ts)."""
    m = np.ones(X['n'].shape[0]) if mask is None else mask.astype(float)
    s = lambda k: float((m[:, None] * X[k]).sum())
    n, nd = s('n'), s('nd')
    ut = {}
    for tal, (tal_k, nam) in {'A2': ('g', n), 'A3': ('s', n)}.items():
        p = s(tal_k + kand) / nam if nam else math.nan
        se = math.sqrt(max(p * (1 - p), 0.0) / nam) if nam else math.inf
        ut[tal] = {'punkttal': p, 'marginalvakt': [p - Z * se, p + Z * se]}
    mae = s('a' + kand) / nd if nd else math.nan
    ut['A1'] = {'punkttal': mae, 'marginalvakt': None}       # A1:s fel kräver kvadratsumman per punkt; det naiva felet står i #680
    return ut


def nivaomdragning(X, norr_st, b=B, fro=FRO, delar=True):
    """Nivåerna för båda kandidaterna i de tre schemana, med samma vikter som omdragning() (samma frö, samma ordning)."""
    S, D = X['n'].shape
    rng = np.random.default_rng(fro)
    ws, wd = vikter(rng, S, b), vikter(rng, D, b)
    ett_s, ett_d = np.ones((b, S)), np.ones((b, D))
    del_ = [('totalt', None)] + ([('norr', norr_st.astype(float)), ('soder', (~norr_st).astype(float))] if delar else [])
    ut = {}
    for kand, k in (('lasta', 'f'), ('nya', 'n')):
        ut[kand] = {}
        for dn, mask in del_:
            mv = marginalvakt(X, k, mask)
            for tal in (('A2', 'A1', 'A3') if dn == 'totalt' else ('A2',)):
                rad = {'punkttal': mv[tal]['punkttal'], 'marginalvakt': mv[tal]['marginalvakt'], 'troskel': TROSKEL[tal]}
                for namn, (a, c) in {'S': (ws, ett_d), 'D': (ett_s, wd), 'SD': (ws, wd)}.items():
                    v = niva(X, a, c, k, mask)[tal]; v = v[np.isfinite(v)]
                    rad[namn] = [float(np.quantile(v, 0.025)), float(np.quantile(v, 0.975))]
                rad['SD_nar_over_troskeln'] = bool(rad['SD'][1] > TROSKEL[tal])
                rad['SD_helt_over_troskeln'] = bool(rad['SD'][0] > TROSKEL[tal])
                ut[kand][f'{tal}_{dn}'] = rad
    return ut


def bandnivaer(m, b=B, fro=FRO):
    """Nivåerna per ankarband: varje band dras om för sig, på sina egna stationer och dygn."""
    ut = {}
    for namn, lo, hi in BANDS:
        sel = ((m.ank >= lo) & (m.ank < hi)).to_numpy()
        if not sel.any():
            continue
        X, nst, st, dg = celler(m.sid[sel], m.b[sel], m.norr_f[sel], m.meas_f[sel], m.pb_f[sel], m.pb_n[sel])
        ut[namn] = {'punkter': int(sel.sum()), 'stationer': len(st), 'dygn': len(dg), 'nivaer': nivaomdragning(X, nst, b, fro, delar=False)}
    return ut


def lasning(om):
    lo, hi = om['SD']['A2_totalt']['intervall']
    return {'regel': 'förbättringen i A2 går att skilja från noll om hela SD-intervallet för ΔA2 totalt ligger under 0',
            'skiljer_fran_noll': bool(hi < 0), 'intervall': [lo, hi]}


# ── Punkterna (matt.matt():s, med stationen och halvtimmen kvar) ────────────────────────────────────────────────────────────────
def punkter(matt, provning, pop, pos_df, PH, idx, kedjans, par_=None):
    """matt.matt():s punkter och PB för en kandidat, med halvtimmen och stationen (raderna som matt.matt() och provning.komponenter())."""
    pos = pos_df.set_index('sid')
    st = sorted(pop.sid.unique())
    M, b0 = matt.matris(pop, st)
    RA, ANK = matt.ra_grind_a(M, pos.lon.reindex(st).to_numpy(float), pos.lat.reindex(st).to_numpy(float))
    PH2 = np.round(matt.halvtimmar(PH, idx, b0, M.shape[0]), 2)
    kol = {s: i for i, s in enumerate(kedjans)}
    r, c = np.nonzero(np.isfinite(RA))
    kc = np.array([kol.get(st[x], -1) for x in c], dtype=int)
    med_ph = kc >= 0
    med_ph[med_ph] = np.isfinite(PH2[r[med_ph], kc[med_ph]])
    r, c, kc = r[med_ph], c[med_ph], kc[med_ph]
    punkter_b = {}
    for bb, j in zip(r + b0, kc): punkter_b.setdefault(int(bb), []).append(int(j))
    klon = pos.lon.reindex(kedjans).to_numpy(float); klat = pos.lat.reindex(kedjans).to_numpy(float)
    with (provning.paret(*par_) if par_ else contextlib.nullcontext()):
        ut, _, (W, L) = matt.blandning(pop, PH2, kedjans, klon, klat, b0, punkter_b, None)
    pb = np.array([ut.get((int(bb), int(j)), (np.nan,) * 4)[0] for bb, j in zip(r + b0, kc)])
    med = np.isfinite(pb)
    r, c, pb = r[med], c[med], pb[med]
    lat = pos.lat.reindex(st).to_numpy(float)
    return pd.DataFrame({'b': r + b0, 'sid': np.asarray(st, dtype=object)[c], 'meas': M[r, c], 'pb': pb, 'norr': lat[c] >= NORR_LAT,
                         'ank': ANK[r, c]}), (W, L)


def identitet(matt, df, vantad, namn):
    """Kandidatens summor ur punkterna mot samman:s, exakt (abs_dec på 1e-6 när summan bärs som flyttal)."""
    c = matt.stats(df.meas.to_numpy(), df.pb.to_numpy())
    v = vantad['serier'][SERIE]['totalt']
    fel = [k for k in ('n', 'nDec') if c[k] != v[k]] + [k for k in SUMMOR if abs(c['summor'][k] - v['summor'][k]) > 1e-6]
    if fel:
        raise SystemExit(f'identiteten föll för {namn}: {fel} — {[(c.get(k), v.get(k)) for k in ("n", "nDec")]} '
                         f'{[(c["summor"][k], v["summor"][k]) for k in SUMMOR]}')
    return {'n': c['n'], 'nDec': c['nDec'], 'A2': c['A2'], 'A1': c['A1'], 'A3': c['A3'], 'lika_samman': True}


# ── Körningen ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def kor(a):
    sys.path[:0] = [HERE, os.path.join(FYS, 'ny_kandidat')]
    import vinterkedja, matt, provning, kedjan                 # den frystas kedja och den nyas provning, importerade och orörda
    vinter = a.vinter; fro = fro_for(vinter); v4 = vinter in VINTRAR_V4
    samman_json = json.load(open(a.samman, encoding='utf-8'))
    if v4:
        per = (samman_json.get('per_vinter') or {}).get(vinter)
        if not per:
            raise SystemExit(f'samman bär inte den nya kandidatens tal för {vinter} (per_vinter)')
    else:
        sam = samman_json['jamforelse_2022_23']
        if not sam.get('samma_population'):
            raise SystemExit('samman:s jämförelse på 2022/23 bär inte samma population — inget att dra om')
    fangat = {}
    orig = vinterkedja.mattet
    def fanga(pop, indata, meta, idx, P):
        fangat.update(pop=pop, sids=list(meta.sid), idx=idx, P=P)
        return orig(pop, indata, meta, idx, P)
    vinterkedja.mattet = fanga
    ns = argparse.Namespace(**{k: getattr(a, k) for k in ('vinter', 'kandidat', 'modell', 'indata', 'urvalet_vvis', 'urvalet_metnordic',
                                                           'vvis', 'ifs', 'metnordic', 'smhi', 'arbete')},
                            lw4=getattr(a, 'lw4', None) or [], ut=os.path.join(a.ut, 'fryst'))
    if vinterkedja.kor(ns) != 0 or 'pop' not in fangat:
        raise SystemExit('den låstas vinterkedja stannade (tillägget, identitetsprovet, tidszonen eller MET) — se fryst/')
    vinterkedja.mattet = orig
    if v4:                                                     # den låstas summor ur dess egen kedja i samma körning
        fr = json.load(open(os.path.join(a.ut, 'fryst', f'kuvos-vintrar-{vinter}.json'), encoding='utf-8'))
        olika = provning.skilda_populationer(fr['matt'], per)
        if olika:
            raise SystemExit(f'populationerna skiljer på {vinter} (ersättningsregeln §2): {olika[:10]} — inget att dra om')
        sam = {'frysta': {'serier': fr['matt']['serier']}, 'nya': {'serier': per['serier']}}
    pos = kedjan.stationer(a.indata)
    pop = fangat['pop']
    logg('den låsta: punkterna')
    df_f, par_f = punkter(matt, provning, pop, pos, fangat['P'], fangat['idx'], fangat['sids'])
    P_n, idx_n, sids_n = kedjan.las_ph(a.ny_ph)
    logg('den nya: punkterna')
    df_n, par_n = punkter(matt, provning, pop, pos, P_n, idx_n, sids_n, NY_PAR)
    s = {'_om': (f"DECISIONS {'#711' if v4 else '#707'}: osäkerheten i jämförelsen på {vinter}, den låsta mot den nyas veck utan {vinter}, "
                 'NIVÅ 2+BLANDNING, med omdragning av stationer och dygn. Diagnos: ändrar ingen dom. Bara aggregat.'),
         'vinter': vinter, 'par': {'lasta': {'W': par_f[0], 'L_km': par_f[1]}, 'nya': {'W': par_n[0], 'L_km': par_n[1]}},
         'identitet': {'lasta': identitet(matt, df_f, sam['frysta'], 'den låsta'), 'nya': identitet(matt, df_n, sam['nya'], 'den nya')}}
    m = df_f.merge(df_n, on=['b', 'sid'], suffixes=('_f', '_n'), how='inner', validate='one_to_one')
    if not (len(m) == len(df_f) == len(df_n) and np.array_equal(m.meas_f.to_numpy(), m.meas_n.to_numpy())):
        raise SystemExit(f'punktmängderna skiljer: {len(df_f)} / {len(df_n)} / gemensamma {len(m)}')
    s['identitet']['samma_punkter'] = int(len(m))
    X, norr_st, st, dg = celler(m.sid, m.b, m.norr_f, m.meas_f, m.pb_f, m.pb_n)
    s['celler'] = {'stationer': len(st), 'dygn': len(dg), 'celler_med_punkter': int((X['n'] > 0).sum()), 'norr_stationer': int(norr_st.sum())}
    s['punkttal'] = punkttal(X, norr_st)
    s['naivt'] = naivt(m.meas_f, m.pb_f, m.pb_n)
    s['omdragning'] = {'B': B, 'fro': fro, 'scheman': omdragning(X, norr_st, fro=fro)}
    s['lasning'] = lasning(s['omdragning']['scheman'])
    if not np.array_equal(m.ank_f.to_numpy(), m.ank_n.to_numpy(), equal_nan=True):
        raise SystemExit('ankaravstånden skiljer mellan kandidaterna — de ska komma ur samma population')
    m = m.rename(columns={'ank_f': 'ank'})
    logg('nivåerna (#708)')
    s['nivaer'] = {'_om': 'DECISIONS #708: nivåerna för båda kandidaterna med samma omdragning, totalt och per ankarband. Diagnos.',
                   'totalt': nivaomdragning(X, norr_st, fro=fro), 'band': bandnivaer(m, fro=fro)}
    os.makedirs(a.ut, exist_ok=True)
    json.dump(s, open(os.path.join(a.ut, f'osakerhet_{vinter}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(os.path.join(a.ut, f'osakerhet_{vinter}.md'), 'w', encoding='utf-8').write(markdown(s) + markdown_nivaer(s['nivaer'], vinter))
    logg(markdown(s) + markdown_nivaer(s['nivaer'], vinter))
    return 0


def markdown(s):
    pe = lambda x: f'{100 * x:+.3f} pe'.replace('.', ',')
    gr = lambda x: f'{x:+.4f} °C'.replace('.', ',')
    iv = lambda v, f: f'[{f(v[0])} ; {f(v[1])}]'
    sch = s['omdragning']['scheman']
    rad = lambda namn, k, f: (f"| {namn} | {f(s['punkttal'][k])} | " + ' | '.join(iv(sch[x][k]['intervall'], f) for x in ('SD', 'S', 'D'))
                              + f" | {sch['SD'][k]['andel_ge_0']:.3f} |".replace('.', ','))
    L = s['lasning']
    return '\n'.join([
        f"## Osäkerheten på {s['vinter'].replace('-', '/')}: den nya mot den låsta, NIVÅ 2+BLANDNING "
        f"(DECISIONS {'#707' if s['vinter'] == VINTER else '#711'}) → "
        f"**{'går att skilja från noll' if L['skiljer_fran_noll'] else 'går inte att skilja från noll'}**", '',
        f"Identitet: båda kandidaternas summor lika samman:s, {s['identitet']['samma_punkter']} gemensamma punkter vid "
        f"{s['celler']['stationer']} stationer och {s['celler']['dygn']} dygn ({s['celler']['celler_med_punkter']} celler). "
        f"B = {s['omdragning']['B']} per schema.", '',
        '| Δ (den nya − den låsta) | på populationen | 95 %, stationer och dygn (SD) | stationer (S) | dygn (D) | andel ≥ 0 (SD) |',
        '| :-- | --: | --: | --: | --: | --: |',
        rad('A2 totalt', 'A2_totalt', pe), rad('A2 norr', 'A2_norr', pe), rad('A2 söder', 'A2_soder', pe),
        rad('A1 totalt', 'A1_totalt', gr), rad('A3 totalt', 'A3_totalt', pe), '',
        f"Naivt, med punkterna som oberoende: ΔA2 {pe(s['naivt']['dA2'])}, intervall {iv(s['naivt']['intervall'], pe)}.", '',
        f"Läsningen (skriven före räkningen): {L['regel']}.", ''])


def markdown_nivaer(nv, vinter=VINTER):
    pct = lambda x: f'{100 * x:.2f} %'.replace('.', ',')
    gr = lambda x: f'{x:.3f} °C'.replace('.', ',')
    fm = lambda tal: gr if tal == 'A1' else pct
    iv = lambda v, f: '—' if v is None else f'{f(v[0])} – {f(v[1])}'
    def rader(tab, prefix=''):
        ut = []
        for kand, namn in (('lasta', 'den låsta'), ('nya', 'den nya')):
            for k, r in tab[kand].items():
                tal = k.split('_')[0]; f = fm(tal)
                flagga = 'helt över' if r['SD_helt_over_troskeln'] else ('når över' if r['SD_nar_over_troskeln'] else 'under')
                ut.append(f"| {prefix}{namn} | {k.replace('_', ' ')} | {f(r['punkttal'])} | {iv(r['marginalvakt'], f)} | {iv(r['SD'], f)} | "
                          f"{iv(r['S'], f)} | {iv(r['D'], f)} | {f(r['troskel'])} | {flagga} |")
        return ut
    head = ['| Kandidat | Mått | Punkttal | Marginalvakten | 95 % SD | S | D | Tröskel | SD mot tröskeln |',
            '| :-- | :-- | --: | --: | --: | --: | --: | --: | :-- |']
    ut = ['', f"## Nivåerna på {vinter.replace('-', '/')} med samma omdragning (DECISIONS {'#708' if vinter == VINTER else '#711'}, diagnos)",
          ''] + head + rader(nv['totalt']) + ['', '**Per ankarband**', ''] + head
    for band, x in nv['band'].items():
        ut += rader(x['nivaer'], f"{band} ({x['stationer']} st, {x['punkter']} p) · ")
    return '\n'.join(ut + [''])


# ── Självtestet ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def sjalvtest():
    fel = []
    def k(ok, msg):
        print(('  ok   ' if ok else '  FEL  ') + msg)
        if not ok: fel.append(msg)
    rng = np.random.default_rng(1)
    S, D, per = 40, 30, 20                                                   # 40 stationer, 30 dygn, 20 halvtimmar per cell
    sid = np.repeat([f's{i:02d}' for i in range(S)], D * per)
    dag = np.tile(np.repeat(np.arange(D), per), S)
    b = dag * (DYGN_S // BUCKET_S) + np.tile(np.arange(per), S * D)
    norr = np.repeat(np.arange(S) < 10, D * per)
    meas = rng.normal(0, 3, sid.size)
    pf = meas + rng.normal(0, 1.6, sid.size)
    # 1. Samma kandidat två gånger: Δ = 0 i varje omdragning.
    X, nst, st, dg = celler(sid, b, norr, meas, pf, pf)
    k(len(st) == S and len(dg) == D and X['n'].sum() == sid.size and nst.sum() == 10, f'cellerna: {len(st)} stationer, {len(dg)} dygn')
    om = omdragning(X, nst, b=200)
    k(all(v['intervall'] == [0.0, 0.0] and v['andel_ge_0'] == 1.0 for sch in om.values() for v in sch.values()),
      'samma kandidat två gånger: Δ = 0 i alla omdragningar och alla tal')
    # 2. En jämn förbättring, oberoende punkter: SD-intervallet under noll och nära det naiva.
    pn = meas + rng.normal(0, 1.45, sid.size)
    X, nst, _, _ = celler(sid, b, norr, meas, pf, pn)
    om = omdragning(X, nst, b=400); pt = punkttal(X, nst); nv = naivt(meas, pf, pn)
    lo, hi = om['SD']['A2_totalt']['intervall']
    k(hi < 0 and lo < pt['A2_totalt'] < hi and lasning(om)['skiljer_fran_noll'], f'jämn förbättring: SD [{lo:.4f}, {hi:.4f}] under noll')
    k(abs(pt['A2_totalt'] - nv['dA2']) < 1e-12, 'punkttalet för ΔA2 är det naiva medlet')
    # 3. Förbättringen sitter i några få dygn: dygnsschemat är bredare än det naiva, och SD-intervallet når över noll.
    pn2 = pf.copy()
    bra = np.isin(dag, [3, 17])                                              # två dygn där den nya är mycket bättre
    pn2[bra] = meas[bra] + rng.normal(0, 0.5, int(bra.sum()))
    varre = np.isin(dag, [5, 9, 21, 25])                                     # fyra dygn där den nya är lite sämre
    pn2[varre] = meas[varre] + rng.normal(0, 1.9, int(varre.sum()))
    X, nst, _, _ = celler(sid, b, norr, meas, pf, pn2)
    om = omdragning(X, nst, b=400); nv = naivt(meas, pf, pn2)
    bredd = lambda v: v[1] - v[0]
    k(bredd(om['D']['A2_totalt']['intervall']) > 2 * bredd(nv['intervall']),
      f"klumpat i dygn: dygnsschemat {bredd(om['D']['A2_totalt']['intervall']):.4f} bredare än det naiva {bredd(nv['intervall']):.4f}")
    k(bredd(om['SD']['A2_totalt']['intervall']) >= bredd(om['S']['A2_totalt']['intervall']), 'SD är minst lika brett som stationsschemat')
    # 4. Samma frö ger samma svar; ett annat frö ett annat.
    k(omdragning(X, nst, b=100) == omdragning(X, nst, b=100) and omdragning(X, nst, b=100) != omdragning(X, nst, b=100, fro=7),
      'fröet: samma frö samma svar, ett annat frö ett annat')
    # 5. A1 räknas bara där mätt yta ≥ −5, och A3 är fel sida om noll.
    m5 = np.array([-6.0, 1.0, -1.0, 3.0]); f5 = np.array([-6.0, 1.0, -1.0, 3.0]); n5 = np.array([0.0, 2.0, 3.0, -1.0])
    X5, n5s, _, _ = celler(['a'] * 4, [0, 1, 2, 3], [False] * 4, m5, f5, n5)
    p5 = punkttal(X5, n5s)
    # Den nyas fel 6, 1, 4, 4: A1 bara på de tre med mätt yta ≥ −5 (1 + 4 + 4) / 3 (med punkten under −5 hade det blivit 15 / 4);
    # tre grova fel av fyra; fel sida om noll vid −1 → 3 och 3 → −1.
    k(abs(p5['A1_totalt'] - (1 + 4 + 4) / 3) < 1e-12 and abs(p5['A3_totalt'] - 2 / 4) < 1e-12 and abs(p5['A2_totalt'] - 3 / 4) < 1e-12,
      f"A1 utan punkten under −5, A3 fel sida om noll, A2 grova fel: {p5}")
    # 6. Nivåerna (#708): samma vikter som skillnaden, så att ny − låst per omdragning är exakt Δ.
    X, nst, _, _ = celler(sid, b, norr, meas, pf, pn2)
    rng6 = np.random.default_rng(FRO); ws6, wd6 = vikter(rng6, X['n'].shape[0], 50), vikter(rng6, X['n'].shape[1], 50)
    d6 = deltan(X, ws6, wd6)['A2']
    k(np.allclose(niva(X, ws6, wd6, 'n')['A2'] - niva(X, ws6, wd6, 'f')['A2'], d6),
      'nivåerna: den nya minus den låsta per omdragning är exakt skillnaden')
    # 7. En nivå nära taket med klumpar i dygn: punkttalet under 5 %, marginalvakten under, men SD-intervallet når över taket.
    pf7 = meas + rng.normal(0, 0.45, sid.size)                               # få grova fel i grunden
    for dd in (2, 11):                                                        # två dygn av 30 med många grova fel: A2 ≈ 3,5 %
        m_ = dag == dd; pf7[m_] = meas[m_] + rng.normal(0, 3.2, int(m_.sum()))
    X7, n7, _, _ = celler(sid, b, norr, meas, pf7, pf7)
    nv7 = nivaomdragning(X7, n7, b=300)['lasta']['A2_totalt']
    k(nv7['punkttal'] < 0.05 and nv7['marginalvakt'][1] < 0.05 and nv7['SD'][1] > 0.05 and nv7['SD_nar_over_troskeln']
      and not nv7['SD_helt_over_troskeln'],
      f"nära taket: punkttalet {nv7['punkttal']:.4f} och marginalvakten {nv7['marginalvakt'][1]:.4f} under 5 %, SD {nv7['SD'][1]:.4f} når över")
    nv7b = nivaomdragning(X, nst, b=200)['lasta']['A1_totalt']
    k(nv7b['marginalvakt'] is None and nv7b['SD'][0] <= nv7b['punkttal'] <= nv7b['SD'][1], 'A1:s nivå: punkttalet inne i SD-intervallet')
    # 8. Banden: varje band dras om för sig och bär sina egna punkter.
    ank8 = np.where(np.repeat(np.arange(S), D * per) % 2 == 0, 3.0, 25.0)
    m8 = pd.DataFrame({'sid': sid, 'b': b, 'norr_f': norr, 'meas_f': meas, 'pb_f': pf, 'pb_n': pn, 'ank': ank8})
    bn = bandnivaer(m8, b=100)
    k(set(bn) == {'0–7 km', '>20 km'} and bn['0–7 km']['punkter'] + bn['>20 km']['punkter'] == sid.size
      and bn['0–7 km']['stationer'] == S // 2, f"banden: {[(x, bn[x]['punkter'], bn[x]['stationer']) for x in bn]}")
    # 9. Tilläggets vintrar (#711): fröet per vinter, och en vinter utanför fälls.
    k(fro_for('2022-23') == 20261024 and all(fro_for(v) == 20261025 for v in VINTRAR_V4), 'fröet: 2022/23 som förut, tilläggets vintrar 20261025')
    try:
        fro_for('2024-25'); k(False, 'en vinter utanför tillägget fick ett frö')
    except ValueError:
        pass
    k(markdown_nivaer({'totalt': {'lasta': {}, 'nya': {}}, 'band': {}}, '2019-20').splitlines()[1].startswith('## Nivåerna på 2019/20')
      and '(DECISIONS #711' in markdown_nivaer({'totalt': {'lasta': {}, 'nya': {}}, 'band': {}}, '2019-20'), 'rubriken bär vintern och beslutet')
    print(('✓ självtest' if not fel else f'✗ självtest: {len(fel)} fel') + ': cellerna, omdragningen i tre scheman, punkttalen, det naiva '
          'felet, klumpning i dygn, fröet, måttens definitioner, nivåerna mot taket och banden (#708), och tilläggets vintrar (#711)')
    return 1 if fel else 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--sjalvtest', action='store_true')
    ap.add_argument('--vinter', default=VINTER); ap.add_argument('--kandidat'); ap.add_argument('--modell'); ap.add_argument('--indata')
    ap.add_argument('--urvalet-vvis'); ap.add_argument('--urvalet-metnordic')
    ap.add_argument('--vvis'); ap.add_argument('--ifs'); ap.add_argument('--metnordic', nargs='+', default=[])
    ap.add_argument('--smhi'); ap.add_argument('--arbete'); ap.add_argument('--ut')
    ap.add_argument('--ny-ph'); ap.add_argument('--samman'); ap.add_argument('--lw4', nargs='+', default=[])
    a = ap.parse_args()
    if a.sjalvtest:
        sys.exit(sjalvtest())
    if a.vinter != VINTER and a.vinter not in VINTRAR_V4:
        sys.exit(f'bara {VINTER} och tilläggets vintrar {", ".join(VINTRAR_V4)} (DECISIONS #707, #711)')
    sys.exit(kor(a))
