"""Måtten i förregistreringen FLER-VINTRAR §4: grind A:s A1, A2 och A3 på grind A:s population, för RÅ, NIVÅ 2 och NIVÅ 2+BLANDNING.

Populationen är kuvösens (scripts/matningar/kuvos-blandning-2026-10-08.ts), räknad på raderna som databasen bär dem (lasare.rader):
  - vakterna som SQL-satsen där: yta och luft finns och yta ≥ luft − 12 (#75); radvakten (publish/snapshot-core.ts RADVAKT_SQL);
    karantänen (brottSql: brotten mot #75 hos stationen i (t − 7 dygn, t], raden inräknad, < 3); den långsamma vakten (sql/030
    langsam_vakt: en rad med ≥ 24 rader med luft och yta i [t − 24 h, t] och yta ≥ 6 ° under luften i ≥ 90 % av dem gör stationens
    UTC-dygn felaktigt, och givarfelSql stryker dygnet). Jämförelserna görs i heltal (tusendels grader), som numeric i databasen;
  - den senaste raden per station och halvtimme (DISTINCT ON … ORDER BY sample_time DESC);
  - RÅ är grind A:s evaluate(…, { utanOffset: true }) (publish/grind-a.ts): de fem närmaste stationerna inom 50 km (stabil sortering
    på avståndet, stationerna i textordning som ORDER BY station_id), par med minst 20 gemensamma halvtimmar utom den egna, vikten
    1/max(km, 1), bara halvtimmar med mätt yta ≤ +5; ankKm = närmaste bidragande granne. Summorna i samma ordning som där;
  - punkterna där PH och PB har värde.
Kandidaten vid punkten:
  - NIVÅ 2 = PH, timvärdena ur kedjan och halvtimmen som medlet av de två timmarna (fysik/kuvos_replica.py:99–111), avrundat till
    hundradelar som den levande kedjans PH (fysik/live/kandidat_fysik.py) och kuvösens filer;
  - NIVÅ 2+BLANDNING = PB ur den levande kedjans timme() (fysik/live/kandidat_timme.py, importerad, oförändrad) vid halvtimmen, med
    alla kedjans stationer som punkter (PH) och halvtimmens population som ankare: de 8 närmaste ändliga grannfelen inom 300 km,
    RÅ ur de 5 närmaste ankarna inom 50 km och paret ur kandidatfilen. Stationen är aldrig sitt eget ankare eller fel (timme()).
  - Skillnaden mot kuvösens replika (de 32 närmaste, sedan de 8 första ändliga) redovisas för sig (§2).
Måtten är grind-a.ts stats(): A1 medelfelet i absoluta tal där mätt yta ≥ −5, A2 andelen |fel| > 2, A3 fel sida om noll, med
standardfelen (publish/marginal.ts) och marginalen 1,96 · fel. Per ankarband (lo ≤ ankKm < hi, som grind-a.ts), norr och söder om 62°
och per månad (svensk tid). Summorna bärs med, så att vintrarna kan slås ihop (samman). Allt som lämnar modulen är aggregat.
"""
import json, math, os, sys
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
FYS = os.path.dirname(HERE)
sys.path[:0] = [os.path.join(FYS, 'live')]
from kandidat_timme import timme, par, hav as hav_timme, K_RES, RMAX_RES, L_RES, SHRINK

BUCKET_S = 1800
K_NEIGHBOURS, MAX_KM, MIN_SHARED = 5, 50.0, 20                                   # publish/grind-a.ts
BANDS = [('0–7 km', 0, 7), ('7–15 km', 7, 15), ('15–20 km', 15, 20), ('>20 km', 20, math.inf)]   # grind-a.ts BANDS
GIVARVAKT_C = 12                                                                  # #75: surface_temp_c >= air_temp_c - 12
GIVARFEL_LUFT_MIN_C, GIVARFEL_GAP_C, KARANTAN_DYGN, KARANTAN_BROTT = 10, 8, 7, 3  # publish/snapshot-core.ts
LANGSAM_GAP_C, LANGSAM_TIONDELAR, LANGSAM_MIN = 6, 9, 24                          # sql/030: >= 6, >= 0.9 * n24, n24 >= 24
NORR_LAT, Z, A2_TAK = 62, 1.96, 0.05
REPLIKANS_NARMASTE = 32                                                           # fysik/kuvos_replica.py:119 (K_RES * 4)
SERIER = ('RÅ', 'NIVÅ 2', 'NIVÅ 2+BLANDNING')


def epok(ts):
    return pd.to_datetime(ts).to_numpy().astype('datetime64[s]').astype('int64')


def fonstersumma(g, t, x, bakat, slutet):
    """Summan av x över raderna hos samma station i (t − bakat, t] (slutet=False) eller [t − bakat, t] (slutet=True), raden själv
    inräknad. g: stationens nummer, t: sekunder; raderna sorterade på (g, t). Exakt i heltal."""
    nyckel = g.astype(np.int64) * 10 ** 10 + t                          # stationerna isär: ett fönster når aldrig grannstationen
    j = np.searchsorted(nyckel, nyckel - bakat, side='left' if slutet else 'right')
    c = np.concatenate([[0], np.cumsum(x)])
    return c[np.arange(len(t)) + 1] - c[j]


def vakter(r):
    """r: sid, ts (UTC), yta, luft (Int64, tusendels grader; yta finns). → (populationen sid, b, yta °C; antalen)."""
    r = r.sort_values(['sid', 'ts'], kind='stable').reset_index(drop=True)
    yta = r.yta.to_numpy(np.int64)
    har = r.luft.notna().to_numpy()
    luft = r.luft.fillna(0).to_numpy(np.int64)
    g = r.sid.factorize()[0]; t = epok(r.ts)
    g75 = har & (yta >= luft - GIVARVAKT_C * 1000)
    radvakt = ~har | (luft < GIVARFEL_LUFT_MIN_C * 1000) | (luft - yta < GIVARFEL_GAP_C * 1000)
    brott = (har & (yta < luft - GIVARVAKT_C * 1000)).astype(np.int64)
    karantan = fonstersumma(g, t, brott, KARANTAN_DYGN * 86400, slutet=False) < KARANTAN_BROTT      # brottSql: (t − 7 d, t], i UTC
    # Den långsamma vakten: fönstret [t − 24 h, t] över raderna med luft och yta (sql/030), och felets UTC-dygn stryks för stationen.
    gl, tl = g[har], t[har]
    n24 = fonstersumma(gl, tl, np.ones(len(tl), np.int64), 86400, slutet=True)
    st24 = fonstersumma(gl, tl, ((luft - yta) >= LANGSAM_GAP_C * 1000)[har].astype(np.int64), 86400, slutet=True)
    i_felet = (n24 >= LANGSAM_MIN) & (10 * st24 >= LANGSAM_TIONDELAR * n24)
    dygn = t // 86400
    feldygn = np.unique(g[har][i_felet].astype(np.int64) * 10 ** 6 + dygn[har][i_felet])
    langsam = ~np.isin(g.astype(np.int64) * 10 ** 6 + dygn, feldygn)
    keep = g75 & radvakt & karantan & langsam
    n = {'rader_med_yta': int(len(r)), 'efter_#75': int(g75.sum()), 'efter_radvakten': int((g75 & radvakt).sum()),
         'efter_karantanen': int((g75 & radvakt & karantan).sum()), 'efter_langsamma_vakten': int(keep.sum()),
         'stationsdygn_i_felet': int(len(feldygn))}
    p = pd.DataFrame({'sid': r.sid[keep].to_numpy(), 'b': t[keep] // BUCKET_S, 't': t[keep], 'yta': yta[keep] / 1000.0})
    p = p.sort_values(['sid', 'b', 't'], kind='stable').drop_duplicates(['sid', 'b'], keep='last')
    pop = p[['sid', 'b', 'yta']].reset_index(drop=True)
    n.update(halvtimmar=int(len(pop)), stationer=int(pop.sid.nunique()))
    return pop, n


def hav_grind_a(lon1, lat1, lon2, lat2):
    """publish/grind-a.ts haversineKm, i samma ordning."""
    R = 6371.0
    dLa = (lat2 - lat1) * math.pi / 180; dLo = (lon2 - lon1) * math.pi / 180
    a = np.sin(dLa / 2) ** 2 + np.cos(lat1 * math.pi / 180) * np.cos(lat2 * math.pi / 180) * np.sin(dLo / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))


def matris(pop, sids):
    """Populationen som (halvtimmar × stationer); b0 är första halvtimmen."""
    b0 = int(pop.b.min()); nb = int(pop.b.max()) - b0 + 1
    col = {s: i for i, s in enumerate(sids)}
    M = np.full((nb, len(sids)), np.nan)
    M[pop.b.to_numpy() - b0, pop.sid.map(col).to_numpy()] = pop.yta.to_numpy()
    return M, b0


def ra_grind_a(M, lon, lat):
    """evaluate(stations, { utanOffset: true }) på matrisen (stationerna i textordning). → (RÅ, ankKm), NaN där ingen punkt."""
    nb, ns = M.shape
    fin = np.isfinite(M)
    RA = np.full((nb, ns), np.nan); ANK = np.full((nb, ns), np.nan)
    for j in range(ns):
        d = hav_grind_a(lon[j], lat[j], lon, lat)
        c = np.array([n for n in range(ns) if n != j and d[n] <= MAX_KM], dtype=int)
        c = c[np.argsort(d[c], kind='stable')][:K_NEIGHBOURS]
        wsum = np.zeros(nb); psum = np.zeros(nb); ank = np.full(nb, np.inf)
        for n in c:
            if (fin[:, j] & fin[:, n]).sum() - 1 < MIN_SHARED:
                continue
            f = fin[:, n]; w = 1.0 / max(d[n], 1.0)
            wsum = np.where(f, wsum + w, wsum)
            psum = np.where(f, psum + w * np.where(f, M[:, n], 0.0), psum)
            ank = np.where(f & (d[n] < ank), d[n], ank)
        pkt = fin[:, j] & (np.where(fin[:, j], M[:, j], np.inf) <= 5) & (wsum > 0)
        RA[pkt, j] = psum[pkt] / wsum[pkt]; ANK[pkt, j] = ank[pkt]
    return RA, ANK


def halvtimmar(P, idx, b0, nb):
    """Kedjans timvärden (timmar × stationer) på halvtimmarna b0 … b0 + nb − 1: timmen själv, och halvtimmen som medlet av de två
    timmarna omkring (fysik/kuvos_replica.py:98–111, utan stationsslingan)."""
    hb = pd.DatetimeIndex(idx).values.astype('datetime64[s]').astype('int64') // BUCKET_S
    PH = np.full((nb, P.shape[1]), np.nan)
    rader = hb - b0
    god = (rader >= 0) & (rader < nb)
    r, ph = rader[god], P[god]
    PH[r] = ph
    mid = r[:-1] + 1
    v = 0.5 * (ph[:-1] + ph[1:])
    m2 = (mid < nb) & (np.diff(r) == 2)
    PH[mid[m2]] = v[m2]
    return PH


def blandning(pop, PH2, kedjans, lon, lat, b0, punkter_b, logg=print):
    """PB vid populationens punkter ur timme() halvtimme för halvtimme. PH2: (halvtimmar × kedjans stationer), avrundat.
    punkter_b: {b: [kolumner i kedjans ordning]} — punkterna som ska mätas. Returnerar {(b, kolumn): (pb, corr, ra, ank)} och
    replikans urval: {(b, kolumn): corr med de 32 närmaste, sedan de 8 första ändliga} där det skiljer sig."""
    W, L = par()
    col = {s: i for i, s in enumerate(kedjans)}
    p = pop.sort_values('b', kind='stable')
    bv = p.b.to_numpy(); grans = np.searchsorted(bv, sorted(punkter_b))
    # Grannlistorna för replikans jämförelse: alla inom 300 km sorterade på avståndet, utom stationen själv (som timme()).
    D = hav_timme(lon[:, None], lat[:, None], lon[None, :], lat[None, :])
    np.fill_diagonal(D, np.inf)
    listor = [np.flatnonzero(D[j] <= RMAX_RES)[np.argsort(D[j][D[j] <= RMAX_RES], kind='stable')] for j in range(len(kedjans))]
    ut, rep = {}, {}
    for k, b in enumerate(sorted(punkter_b)):
        i = b - b0
        ph = PH2[i]; f = np.isfinite(ph)
        punkter = pd.DataFrame({'punkt': np.asarray(kedjans, dtype=object)[f], 'lon': lon[f], 'lat': lat[f], 'ph': ph[f]})
        a0 = grans[k]; a1 = np.searchsorted(bv, b, side='right')
        a = p.iloc[a0:a1]
        ac = a.sid.map(col).to_numpy()
        ankare = pd.DataFrame({'punkt': a.sid.to_numpy(dtype=object), 'yta': a.yta.to_numpy(), 'lon': lon[ac], 'lat': lat[ac]})
        u = timme(punkter, ankare, W, L)
        rad_u = {pk: i for i, pk in enumerate(u.punkt)}
        upb, ucorr, ura, uank = (u[c].to_numpy(float) for c in ('pb', 'corr', 'ra', 'ank_km'))
        res = np.full(len(kedjans), np.nan); res[ac] = a.yta.to_numpy() - ph[ac]
        rf = np.isfinite(res)
        for j in punkter_b[b]:
            i_u = rad_u.get(kedjans[j])
            if i_u is None: continue
            ut[(b, j)] = (float(upb[i_u]), float(ucorr[i_u]), float(ura[i_u]), float(uank[i_u]))
            lst = listor[j]; ff = rf[lst]
            if ff[:REPLIKANS_NARMASTE].sum() < K_RES and ff.sum() > ff[:REPLIKANS_NARMASTE].sum():
                def corr(sel):
                    w = np.exp(-D[j, sel] / L_RES); return float((w * res[sel]).sum() / (w.sum() + SHRINK)) if len(sel) else 0.0
                levande = lst[ff][:K_RES]; replika = lst[:REPLIKANS_NARMASTE][ff[:REPLIKANS_NARMASTE]][:K_RES]
                rep[(b, j)] = (corr(replika), corr(levande))
        if logg and (k + 1) % 1000 == 0:
            logg(f'  blandningen: {k + 1} av {len(punkter_b)} halvtimmar')
    return ut, rep, (W, L)


def stats(meas, pred):
    """grind-a.ts stats() och publish/marginal.ts, plus summorna för sammanslagningen."""
    meas = np.asarray(meas, float); pred = np.asarray(pred, float)
    n = int(meas.size); dec = meas >= -5
    e = pred - meas; ad = np.abs(e[dec]); nd = int(ad.size)
    grova = int((np.abs(e) > 2).sum()); fel_sida = int((((meas < 0) & (pred > 2)) | ((meas > 2) & (pred < 0))).sum())
    return cell(n, nd, float(ad.sum()), float((ad ** 2).sum()), grova, fel_sida,
                mae_se=float(ad.std(ddof=1) / math.sqrt(nd)) if nd > 1 else math.inf)


def cell(n, nd, s1, s2, grova, fel_sida, mae_se=None):
    """En cell med grind-a.ts tal (mae, gross, freeze och deras fel, marginal = 1,96 · fel) och summorna; oändligt och NaN blir null."""
    mae = s1 / nd if nd else math.nan
    if mae_se is None:
        mae_se = math.sqrt(max(s2 - nd * mae * mae, 0.0) / (nd - 1) / nd) if nd > 1 else math.inf
    a2 = grova / n if n else math.nan; a3 = fel_sida / n if n else math.nan
    se = lambda p: math.sqrt(max(p * (1 - p), 0.0) / n) if n > 0 else math.inf
    f = lambda x: float(x) if math.isfinite(x) else None
    return {'n': n, 'nDec': nd, 'A1': f(mae), 'A2': f(a2), 'A3': f(a3), 'A1_se': f(mae_se), 'A2_se': f(se(a2)), 'A3_se': f(se(a3)),
            'A1_marginal': f(Z * mae_se), 'A2_marginal': f(Z * se(a2)), 'A3_marginal': f(Z * se(a3)),
            'summor': {'abs_dec': s1, 'abs2_dec': s2, 'grova': grova, 'fel_sida': fel_sida}}


def uppdelning(meas, preds, ank, norr, manad):
    """Varje serie: totalt, per ankarband, norr och söder, per månad."""
    ut = {}
    for namn, p in preds.items():
        u = {'totalt': stats(meas, p), 'band': {}, 'norr': stats(meas[norr], p[norr]), 'soder': stats(meas[~norr], p[~norr]), 'manad': {}}
        for bn, lo, hi in BANDS:
            m = (ank >= lo) & (ank < hi)
            u['band'][bn] = stats(meas[m], p[m])
        for mn in sorted(set(manad)):
            m = manad == mn
            u['manad'][mn] = stats(meas[m], p[m])
        ut[namn] = u
    return ut


def matt(pop, sids_pos, PH, idx, kedjans, logg=print):
    """Hela §4 för en vinter. pop: vakter() ur raderna; sids_pos: stations.csv (sid, lon, lat); PH: kedjans timvärden
    (timmar × kedjans stationer, kolumnerna i ordningen kedjans). Returnerar aggregaten."""
    pos = sids_pos.set_index('sid')
    st = sorted(pop.sid.unique())                                         # grind A: stationerna i textordning
    M, b0 = matris(pop, st)
    RA, ANK = ra_grind_a(M, pos.lon.reindex(st).to_numpy(float), pos.lat.reindex(st).to_numpy(float))
    nb = M.shape[0]
    PH2 = np.round(halvtimmar(PH, idx, b0, nb), 2)
    kol = {s: i for i, s in enumerate(kedjans)}
    r, c = np.nonzero(np.isfinite(RA))
    kc = np.array([kol.get(st[x], -1) for x in c])
    med_ph = (kc >= 0)
    med_ph[med_ph] = np.isfinite(PH2[r[med_ph], kc[med_ph]])
    logg(f'  RÅ:s punkter {len(r)}; med PH {int(med_ph.sum())} ({len(st)} stationer i populationen, {len(kedjans)} i kedjan)')
    r, c, kc = r[med_ph], c[med_ph], kc[med_ph]
    punkter_b = {}
    for bb, j in zip(r + b0, kc): punkter_b.setdefault(int(bb), []).append(int(j))
    klon = pos.lon.reindex(kedjans).to_numpy(float); klat = pos.lat.reindex(kedjans).to_numpy(float)
    ut, rep, (W, L) = blandning(pop, PH2, kedjans, klon, klat, b0, punkter_b, logg)
    pb = np.array([ut.get((int(bb), int(j)), (np.nan,) * 4)[0] for bb, j in zip(r + b0, kc)])
    med = np.isfinite(pb)
    r, c, kc, pb = r[med], c[med], kc[med], pb[med]
    meas = M[r, c]; ank = ANK[r, c]
    preds = {'RÅ': RA[r, c], 'NIVÅ 2': PH2[r, kc], 'NIVÅ 2+BLANDNING': pb}
    norr = pos.lat.reindex(st).to_numpy(float)[c] >= NORR_LAT
    lokal = pd.to_datetime((r + b0) * BUCKET_S, unit='s', utc=True).tz_convert('Europe/Stockholm')
    manad = np.asarray(lokal.strftime('%Y-%m'))
    serier = uppdelning(meas, preds, ank, norr, manad)
    # Replikans urval av grannfelen (§2): där det skiljer sig ändras PB med (1 − wb) · ΔCORR (RÅ finns) eller ΔCORR (RÅ saknas).
    pb_rep = pb.copy(); olika = 0; dmax = 0.0
    for i, (bb, j) in enumerate(zip(r + b0, kc)):
        x = rep.get((int(bb), int(j)))
        if x is None: continue
        _, corr, ra, ankk = ut[(int(bb), int(j))]
        d = x[0] - x[1]; olika += 1; dmax = max(dmax, abs(d))
        wb = W * math.exp(-ankk / L) if math.isfinite(ra) else 0.0
        pb_rep[i] = round(pb[i] + (1 - wb) * d, 2)
    replika = {'punkter_dar_urvalet_skiljer': olika, 'storsta_skillnad_corr_c': round(dmax, 3),
               'NIVÅ 2+BLANDNING (replikans urval)': stats(meas, pb_rep)}
    return {'population': {'stationer': len(st), 'punkter': int(len(meas)), 'norr': int(norr.sum()), 'soder': int((~norr).sum()),
                           'par': {'W': W, 'L_km': L}},
            'serier': serier, 'replikans_urval': replika}


def samman(sammanfattningar):
    """Vintrarna slagna ihop ur summorna (de fem äldre; 2024/25 i urvalet räknas inte in). Varje cell som summan av cellerna."""
    las = [s for s in sammanfattningar if not s.get('i_urvalet') and 'matt' in s]
    def slå(celler):
        c = [x for x in celler if x]
        return cell(sum(x['n'] for x in c), sum(x['nDec'] for x in c), sum(x['summor']['abs_dec'] for x in c),
                    sum(x['summor']['abs2_dec'] for x in c), sum(x['summor']['grova'] for x in c), sum(x['summor']['fel_sida'] for x in c))
    ut = {}
    for namn in SERIER:
        u = [s['matt']['serier'][namn] for s in las]
        man = sorted({m[5:] for x in u for m in x['manad']}, key=lambda m: (int(m) < 7, m))     # november först
        ut[namn] = {'totalt': slå([x['totalt'] for x in u]), 'norr': slå([x['norr'] for x in u]), 'soder': slå([x['soder'] for x in u]),
                    'band': {bn: slå([x['band'].get(bn) for x in u]) for bn, _, _ in BANDS},
                    'manad': {f'månad {m}': slå([c for x in u for k, c in x['manad'].items() if k[5:] == m]) for m in man}}
    return {'vintrar': [s['vinter'] for s in las], 'serier': ut}


def pct(x, k=2):
    return '—' if x is None else f'{100 * x:.{k}f}'.replace('.', ',') + ' %'


def grad(x, k=3):
    return '—' if x is None else f'{x:.{k}f}'.replace('.', ',') + ' °C'


def tal(n):
    return f'{n:,}'.replace(',', ' ')


def pe(x):
    return '—' if x is None else f'{100 * x:.2f}'.replace('.', ',') + ' pe'


def rad(namn, c):
    if not c or not c['n']:
        return f'| {namn} | 0 | — | — | — |'
    return (f"| {namn} | {tal(c['n'])} | {grad(c['A1'])} ± {grad(c['A1_marginal'])} | {pct(c['A2'])} ± {pe(c['A2_marginal'])} | "
            f"{pct(c['A3'])} ± {pe(c['A3_marginal'])} |")


def kort(c):
    if not c or not c['n']:
        return 'n 0'
    return (f"n {tal(c['n'])} · A1 {grad(c['A1'])} ± {grad(c['A1_marginal'])} · A2 {pct(c['A2'])} ± {pe(c['A2_marginal'])} · "
            f"A3 {pct(c['A3'])} ± {pe(c['A3_marginal'])}")


def markdown_serier(serier, rubrik):
    ut = [f'### {rubrik}', '', '| | n | A1 | A2 | A3 |', '| :-- | --: | --: | --: | --: |']
    for namn, u in serier.items():
        ut.append(rad(f'**{namn}**', u['totalt']))
        for bn, c in u['band'].items(): ut.append(rad(f'{namn} · {bn}', c))
        ut.append(rad(f'{namn} · norr ≥ 62°', u['norr'])); ut.append(rad(f'{namn} · söder', u['soder']))
        for mn, c in u.get('manad', {}).items(): ut.append(rad(f'{namn} · {mn}', c))
    return ut
