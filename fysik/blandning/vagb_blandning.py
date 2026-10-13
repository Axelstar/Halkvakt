"""Väg B (DECISIONS #544, kort #342), step (d): the blend weight chosen per fold, on the other four folds only.

Runs Axel's frozen kuvos_replica.py unchanged on the honest estimate (fysik/niva2/vagb.py's oof_vagb_*.npy): RÅ, the anchor distance
and the neighbours' errors with their frozen constants (100 km, K = 8, 300 km, 0.5). Then it blends with each pair of the registered
grid W ∈ {0, 0.25, 0.5, 0.75, 1} × L ∈ {40, 80, 160} km by the replica's own formula. For fold f the pair with the fewest gross
errors (> 2 °C) on the other four folds' stations is chosen — the replica's population: an anchor, measured ≤ +5 °C — and fold f's
stations get that pair's blend. Before anything is written, Axel's pair (0.5, 80 km) must give the replica's PB byte for byte.
Out as grannar_blandning.py writes it: NIVÅ 2 ÄRLIG, +GRANNAR, +BLANDNING in the FYSIK file's form and manifest.json. The files carry
the neighbours' measured surface and never leave the job (DECISIONS #506, #516); the log carries aggregates only.
  cd /home/claude/fys && python3 blandning/vagb_blandning.py --oof <oof_vagb_analys.npy> --veck <veck_vagb.json> --ut <dir>
         [--lage 'prognos +6 h' --kod prognos6 --lagg-till]
  python3 fysik/blandning/vagb_blandning.py --sjalvtest          synthetic data only; runs in ci.yml
"""
import argparse, hashlib, json, os, runpy, shutil, sys, tempfile
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from grannar_blandning import manifest, D

GRID = [(w, l) for w in (0.0, 0.25, 0.5, 0.75, 1.0) for l in (40.0, 80.0, 160.0)]
AXEL = (0.5, 80.0)


def blanda(RA, PG, ANK, w, l):
    """kuvos_replica.py's blend, line for line, with the weight's height w and length l as arguments."""
    wb = w * np.exp(-np.nan_to_num(ANK, nan=1e9) / l)
    return np.where(np.isfinite(RA), wb * RA + (1 - wb) * PG, PG)


def grova(M, P, ANK, cols):
    """The share of gross errors on the replica's population (an anchor, measured ≤ +5 °C), on the given stations only."""
    m, p, a = M[:, cols], P[:, cols], ANK[:, cols]
    ok = np.isfinite(a) & np.isfinite(m) & np.isfinite(p) & (m <= 5)
    return float((np.abs(p[ok] - m[ok]) > 2).mean()) if ok.any() else float('nan')


def valj(M, RA, PG, ANK, kolveck):
    """For each fold f the grid pair with the fewest gross errors on the other folds' stations. Returns {f: pair}, {f: {pair: share}}
    and the pair chosen on all folds (the frozen candidate's weight, #544 point 6)."""
    kand = {par: blanda(RA, PG, ANK, *par) for par in GRID}
    val, tab = {}, {}
    for f in range(5):
        tr = np.where((kolveck >= 0) & (kolveck != f))[0]
        tab[f] = {par: grova(M, P, ANK, tr) for par, P in kand.items()}
        val[f] = min(GRID, key=lambda par: tab[f][par])
    alla = np.where(kolveck >= 0)[0]
    tot = {par: grova(M, P, ANK, alla) for par, P in kand.items()}
    return val, tab, min(GRID, key=lambda par: tot[par]), kand


def arlig_blandning(RA, PG, ANK, kolveck, val, kand):
    """Fold f's stations get the blend with fold f's pair; stations outside the chain's folds keep PG (empty there)."""
    PB = PG.copy()
    for f, par in val.items():
        cols = np.where(kolveck == f)[0]
        PB[:, cols] = kand[par][:, cols]
    return PB


def sjalvtest():
    fel = []
    rng = np.random.default_rng(3)
    nb, ns = 400, 50
    kolveck = np.arange(ns) % 5; kolveck[-1] = -1                       # the last station outside the chain
    M = rng.normal(0, 3, (nb, ns)).astype(np.float32); M[:5] = 8.0     # five buckets above +5 °C, outside the population
    ANK = np.full((nb, ns), 6.0, np.float32); ANK[:, 0] = np.nan          # station 0 without an anchor
    RA = (M + rng.normal(0, 0.5, M.shape)).astype(np.float32)           # RÅ good ...
    RA[:, kolveck == 2] = M[:, kolveck == 2] + 4.0                       # ... except in fold 2
    PG = (M + rng.normal(0, 2.5, M.shape)).astype(np.float32)
    PG[:, -1] = np.nan
    if not np.array_equal(blanda(RA, PG, ANK, 0.0, 80.0), PG, equal_nan=True): fel.append('W = 0 ger grannarna')
    if not np.allclose(blanda(RA, PG, np.zeros_like(ANK), 1.0, 80.0)[:, :-1], RA[:, :-1]): fel.append('W = 1 vid avståndet 0 ger RÅ (där grannarna finns)')
    RA2 = RA.copy(); RA2[3, 7] = np.nan
    if blanda(RA2, PG, ANK, 0.5, 80.0)[3, 7] != PG[3, 7]: fel.append('utan RÅ blir det grannarna')
    hand = 0.5 * np.exp(np.float32(-6.0) / 80.0) * RA[10, 9] + (1 - 0.5 * np.exp(np.float32(-6.0) / 80.0)) * PG[10, 9]
    if abs(blanda(RA, PG, ANK, *AXEL)[10, 9] - hand) > 1e-6: fel.append('Axels par räknat för hand')
    if not np.isnan(grova(M, M + 10, ANK, [0])): fel.append('station utan ankare ingår inte')
    if abs(grova(M, M, ANK, [1, 2]) - 0.0) > 0: fel.append('rätt skattning ger noll grova fel')
    val, tab, alla, kand = valj(M, RA, PG, ANK, kolveck)
    if val[0][0] < 0.75: fel.append(f'veck 0 väljer en tung RÅ-vikt när RÅ är bra på de andra vecken: {val[0]}')
    if not all(abs(tab[f][val[f]] - min(tab[f].values())) == 0 for f in range(5)): fel.append('valet är det minsta på träningsvecken')
    # Ärligheten: veck 2:s mätningar ändras — veck 2:s val står still, men valet för de andra vecken (där veck 2 tränar) får röra sig.
    M2 = M.copy(); M2[:, kolveck == 2] += 3.0
    val2, _, _, _ = valj(M2, RA, PG, ANK, kolveck)
    if val2[2] != val[2]: fel.append(f'veck 2:s val ändras av veck 2:s mätningar: {val[2]} → {val2[2]}')
    PB = arlig_blandning(RA, PG, ANK, kolveck, val, kand)
    for f in range(5):
        c = np.where(kolveck == f)[0]
        if not np.array_equal(PB[:, c], kand[val[f]][:, c], equal_nan=True): fel.append(f'veck {f} får sitt eget par')
    if not np.all(np.isnan(PB[:, -1])): fel.append('stationen utanför vecken förblir tom')
    with tempfile.TemporaryDirectory() as ut:
        g = {'PH': PG - 1, 'PG': PG, 'PB': PB, 'sids': [str(1000 + i) for i in range(ns)], 'b0': 960000}
        m = manifest(g, ut, 'NIVÅ 2 ÄRLIG', 'niva2-arlig', 'prognos +6 h', 'prognos6')
        if [f['namn'] for f in m] != ['NIVÅ 2 ÄRLIG', 'NIVÅ 2 ÄRLIG+GRANNAR', 'NIVÅ 2 ÄRLIG+BLANDNING'] or \
                m[2]['fil'] != 'niva2-arlig-blandning-prognos6-2024-25.csv.gz': fel.append(f'manifestet: {m}')
    if len(GRID) != 15 or AXEL not in GRID: fel.append('rutnätet: 15 par med Axels')
    for f in fel: print('✗', f)
    if fel: sys.exit(1)
    print("✓ självtest: blandningen som replikans (W = 0 grannarna, W = 1 vid 0 km RÅ, utan RÅ grannarna, Axels par för hand), valet per "
          "veck på de andra vecken (veck 2:s val står still när veck 2:s mätningar ändras), varje veck sitt par, filerna som grannar_blandning skriver")


if __name__ == '__main__':
    if '--sjalvtest' in sys.argv:
        sjalvtest(); sys.exit(0)
    ap = argparse.ArgumentParser()
    ap.add_argument('--oof', required=True)
    ap.add_argument('--veck', required=True, help='veck_vagb.json ur vagb.py')
    ap.add_argument('--ut', required=True)
    ap.add_argument('--lage', default='analys')
    ap.add_argument('--kod', default='analys')
    ap.add_argument('--lagg-till', action='store_true')
    a = ap.parse_args()
    os.makedirs(a.ut, exist_ok=True)
    shutil.copyfile(a.oof, f'{D}/oof_A2.npy')
    print(f"NIVÅ 2 ÄRLIG ({a.lage}) in i replikan: {a.oof}, sha256 {hashlib.sha256(open(f'{D}/oof_A2.npy', 'rb').read()).hexdigest()}", flush=True)
    g = runpy.run_path(f'{D}/kuvos_replica.py', run_name='__main__')      # the frozen replica, unchanged
    if not np.array_equal(blanda(g['RA'], g['PG'], g['ANK'], *AXEL), g['PB'], equal_nan=True):
        sys.exit('vagb_blandning: Axels par ger inte replikans PB byte för byte — inget skrivs (#544)')
    print('självprovet mot replikan: Axels par (0,5 · 80 km) ger replikans PB byte för byte', flush=True)
    veck = json.load(open(a.veck))
    kolveck = np.array([veck.get(s, -1) for s in g['sids']])
    val, tab, alla, kand = valj(g['M'], g['RA'], g['PG'], g['ANK'], kolveck)
    for f in range(5):
        print(f"veck {f} ({int((kolveck == f).sum())} stationer): paret W {val[f][0]} · L {val[f][1]:g} km, valt på de andra fyra "
              f"(grova {100 * tab[f][val[f]]:.2f} % där; Axels par {100 * tab[f][AXEL]:.2f} %)", flush=True)
    print(f"paret valt på alla veck (den frysta kandidatens vikt, #544 punkt 6): W {alla[0]} · L {alla[1]:g} km", flush=True)
    g2 = dict(g); g2['PB'] = arlig_blandning(g['RA'], g['PG'], g['ANK'], kolveck, val, kand)
    manifest(g2, a.ut, 'NIVÅ 2 ÄRLIG', 'niva2-arlig', a.lage, a.kod, a.lagg_till)
