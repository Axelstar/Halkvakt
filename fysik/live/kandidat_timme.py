"""The candidate live, part B: the hourly step — the neighbours' measured errors, RÅ and the blend at every point (kort #343 steg 3,
DECISIONS #558). The numbers are the frozen replica's (fysik/kuvos_replica.py, its sha256 in fysik/SHA256SUMS), unchanged:
  FYSIK+GRANNAR  the residual measured − PH at the stations, at a point the 8 nearest residuals within 300 km weighted exp(−d/100 km),
                 shrunk by 0.5 (CORR = Σ w·res / (Σ w + 0.5)); a station never corrects itself (the replica's leave-one-out).
  RÅ             grind A's raw distance weighting at the point: up to 5 anchors within 50 km, weight 1/max(km, 1) — the shadow's
                 skatta() (engine/src/segment.ts) and the replica's RA; ANK = the nearest contributing anchor.
  BLANDNING      wb = W · exp(−ANK / L) with the candidate's pair (kuvos/kandidat-2026-27.json: W 0,25, L 160 km, DECISIONS #552);
                 PB = wb · RÅ + (1 − wb) · PG where RÅ exists, else PG. PB is the candidate's value.
The measurements are grind A's population at the hour's bucket (#75, radvakten, karantänen, den långsamma vakten), the same anchors
the shadow reads (sql/032 vagpunkt_ankare); reading them and writing the table is the runner's part (kandidat-live.yml). This file
holds the arithmetic and its proof.

  python fysik/live/kandidat_timme.py --sjalvtest          synthetic data only; runs in ci.yml
"""
import json, os, sys
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
KANDIDAT = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'kuvos', 'kandidat-2026-27.json')
K_NEIGHBOURS, MAX_KM = 5, 50.0                                  # RÅ, grind A / segment.ts
L_RES, K_RES, RMAX_RES, SHRINK = 100.0, 8, 300.0, 0.5            # FYSIK+GRANNAR, kuvos_replica.py


def hav(lo1, la1, lo2, la2):
    R = 6371.0; p1, p2 = np.radians(la1), np.radians(la2)
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(np.radians(lo2 - lo1) / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))


def par(fil=KANDIDAT):
    """The blend pair from the candidate file — one place, never a copy."""
    k = json.load(open(fil, encoding='utf-8'))
    return float(k['par']['W']), float(k['par']['L_km'])


def timme(punkter, stationer, W, L):
    """punkter: DataFrame punkt, lon, lat, ph (PH at the hour, every point incl. the stations, punkt = station id for a station).
       stationer: DataFrame punkt, yta (the measured surface at the hour, grind A's population; only stations with a value).
       Returns punkter with corr, pg, ra, ank_km, pb."""
    p = punkter.reset_index(drop=True)
    st = stationer.merge(p[['punkt', 'lon', 'lat', 'ph']], on='punkt', how='inner')     # anchors with both a measurement and PH
    n, m = len(p), len(st)
    corr = np.zeros(n); ra = np.full(n, np.nan); ank = np.full(n, np.nan)
    if m:
        D = hav(p.lon.to_numpy()[:, None], p.lat.to_numpy()[:, None], st.lon.to_numpy()[None, :], st.lat.to_numpy()[None, :])
        sjalv = p.punkt.to_numpy()[:, None] == st.punkt.to_numpy()[None, :]
        D = np.where(sjalv, np.inf, D)                                                     # a station never corrects itself
        res = (st.yta - st.ph).to_numpy(float); yta = st.yta.to_numpy(float)
        for j in range(n):
            d = D[j]
            # FYSIK+GRANNAR: the 8 nearest residuals within 300 km
            c = np.where(d <= RMAX_RES)[0]
            c = c[np.argsort(d[c])][:K_RES]
            if c.size:
                w = np.exp(-d[c] / L_RES)
                corr[j] = (w * res[c]).sum() / (w.sum() + SHRINK)
            # RÅ: the 5 nearest anchors within 50 km, 1/max(km, 1)
            a = np.where(d <= MAX_KM)[0]
            a = a[np.argsort(d[a])][:K_NEIGHBOURS]
            if a.size:
                w = 1.0 / np.maximum(d[a], 1.0)
                ra[j] = (w * yta[a]).sum() / w.sum(); ank[j] = d[a][0]
    pg = p.ph.to_numpy(float) + corr
    wb = W * np.exp(-np.nan_to_num(ank, nan=1e9) / L)
    pb = np.where(np.isfinite(ra), wb * ra + (1 - wb) * pg, pg)
    return p.assign(corr=np.round(corr, 3), pg=np.round(pg, 2), ra=np.round(ra, 2), ank_km=np.round(ank, 1), pb=np.round(pb, 2))


def sjalvtest():
    fel = []
    W, L = par()
    if (W, L) != (0.25, 160.0): fel.append(f'paret ur kandidatfilen: {W}, {L}')
    # Three stations on a line (0, 10, 30 km east of the point) and one road point; a fourth station far away (400 km).
    st = pd.DataFrame({'punkt': ['A', 'B', 'C', 'D'], 'yta': [-1.0, 0.0, 2.0, 5.0]})
    km = 1 / 111.2 / np.cos(np.radians(60))
    p = pd.DataFrame({'punkt': ['v0', 'A', 'B', 'C', 'D'], 'lon': [15.0, 15.0, 15 + 10 * km, 15 + 30 * km, 15 + 400 * km], 'lat': [60.0] * 5,
                      'ph': [1.0, 0.0, 0.5, 1.5, 4.0]})
    u = timme(p, st, W, L).set_index('punkt')
    # Facit med replikans tal utskrivna (100 km, 0,5; 1/max(km, 1); W · exp(−ANK/L)), aldrig modulens konstanter.
    # At v0 (A at 0 km, B 10, C 30; D beyond 300): residuals −1, −0.5, +0.5; weights exp(0), exp(−0.1), exp(−0.3).
    w = np.exp(-np.array([0, 10, 30]) / 100.0); corr = (w * np.array([-1, -0.5, 0.5])).sum() / (w.sum() + 0.5)
    wr = 1 / np.maximum(np.array([0, 10, 30]), 1); ra = (wr * np.array([-1, 0, 2])).sum() / wr.sum()
    pb = 0.25 * ra + 0.75 * (1.0 + corr)                                                  # ANK 0 ⇒ wb = W
    if abs(u.loc['v0', 'corr'] - corr) > 1e-3 or abs(u.loc['v0', 'ra'] - ra) > 0.01 or u.loc['v0', 'ank_km'] != 0.0 or abs(u.loc['v0', 'pb'] - pb) > 0.01:
        fel.append(f'v0: corr {u.loc["v0", "corr"]} ({corr:.3f}), ra {u.loc["v0", "ra"]} ({ra:.2f}), ank {u.loc["v0", "ank_km"]}, pb {u.loc["v0", "pb"]} ({pb:.2f})')
    # At station A: itself excluded, so corr comes from B and C only, RÅ from B and C with ANK 10 km, and the blend weight
    # 0,25 · exp(−10/160) — the only case where L matters.
    w2 = np.exp(-np.array([10, 30]) / 100.0); corr_a = (w2 * np.array([-0.5, 0.5])).sum() / (w2.sum() + 0.5)
    wr2 = 1 / np.array([10, 30]); ra_a = (wr2 * np.array([0, 2])).sum() / wr2.sum()
    wb_a = 0.25 * np.exp(-10 / 160); pb_a = wb_a * ra_a + (1 - wb_a) * (0.0 + corr_a)
    if abs(u.loc['A', 'corr'] - corr_a) > 1e-3 or u.loc['A', 'ank_km'] != 10.0 or abs(u.loc['A', 'pb'] - pb_a) > 0.006:
        fel.append(f'A korrigerar inte sig själv, och blandas med exp(−10/160): corr {u.loc["A", "corr"]} ({corr_a:.3f}), ank {u.loc["A", "ank_km"]}, pb {u.loc["A", "pb"]} ({pb_a:.3f})')
    # At D (400 km from the others): no residual within 300 km, no anchor within 50 km ⇒ corr 0, pb = ph.
    if u.loc['D', 'corr'] != 0 or not np.isnan(u.loc['D', 'ra']) or u.loc['D', 'pb'] != 4.0: fel.append(f'D utan grannar: {u.loc["D"].to_dict()}')
    # The caps: 12 stations within 20 km with values 1…12 by distance — only the 8 nearest residuals and the 5 nearest anchors count.
    st2 = pd.DataFrame({'punkt': [f's{i}' for i in range(12)], 'yta': [float(i + 1) for i in range(12)]})
    p2 = pd.DataFrame({'punkt': ['v1'] + list(st2.punkt), 'lon': [15.0] + [15 + (i + 1) * 1.5 * km for i in range(12)], 'lat': [60.0] * 13, 'ph': [0.0] * 13})
    u2 = timme(p2, st2, W, L).set_index('punkt')
    d8 = np.array([(i + 1) * 1.5 for i in range(8)]); w8 = np.exp(-d8 / 100.0); corr8 = (w8 * np.arange(1, 9)).sum() / (w8.sum() + 0.5)
    if abs(u2.loc['v1', 'corr'] - corr8) > 1e-3: fel.append(f'bara de åtta närmaste felen räknas: {u2.loc["v1", "corr"]} ({corr8:.3f})')
    d5 = np.array([(i + 1) * 1.5 for i in range(5)]); w5 = 1 / np.maximum(d5, 1); ra5 = (w5 * np.arange(1, 6)).sum() / w5.sum()
    if abs(u2.loc['v1', 'ra'] - ra5) > 0.006 or u2.loc['v1', 'ank_km'] != 1.5: fel.append(f'RÅ ur de fem närmaste: {u2.loc["v1", "ra"]} ({ra5:.3f}), ank {u2.loc["v1", "ank_km"]}')
    # A station without a measurement at the hour is not an anchor and gives no residual.
    u3 = timme(p, st[st.punkt != 'A'], W, L).set_index('punkt')
    if u3.loc['v0', 'ank_km'] != 10.0: fel.append(f'en station utan mätning är inget ankare: ank {u3.loc["v0", "ank_km"]}')
    for f in fel: print('✗', f)
    if fel: sys.exit(1)
    print('✓ självtest: grannarnas fel (åtta närmaste inom 300 km, exp(−d/100), krympning 0,5, aldrig sig själv), RÅ (fem inom 50 km, 1/max(km, 1)), '
          f'blandningen med paret W {W} · L {L:g} km ur kandidatfilen, taken och en station utan mätning')


if __name__ == '__main__':
    if '--sjalvtest' in sys.argv:
        sjalvtest(); sys.exit(0)
    print('kör: kandidat_timme.py --sjalvtest (räknedelen; körningen hör till kandidat-live.yml)'); sys.exit(2)
