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
       stationer: DataFrame punkt, yta, lon, lat (the measured surface at the hour, grind A's population, with the station's own
       position). Every station is an anchor for RÅ; only a station that also has PH gives a residual — as the replica and the shadow.
       Returns punkter with corr, pg, ra, ank_km, pb, and RÅ's anchors: n_ank (how many contribute, 0–5) and spr (their spread,
       largest minus smallest surface, 0 with one, NaN without — the spread gate's input, DECISIONS #474, #575)."""
    p = punkter.reset_index(drop=True)
    st = stationer[['punkt', 'yta', 'lon', 'lat']].merge(p[['punkt', 'ph']], on='punkt', how='left').reset_index(drop=True)
    n, m = len(p), len(st)
    corr = np.zeros(n); ra = np.full(n, np.nan); ank = np.full(n, np.nan); nank = np.zeros(n, dtype=int); spr = np.full(n, np.nan)
    if m:
        D = hav(p.lon.to_numpy()[:, None], p.lat.to_numpy()[:, None], st.lon.to_numpy()[None, :], st.lat.to_numpy()[None, :])
        sjalv = p.punkt.to_numpy()[:, None] == st.punkt.to_numpy()[None, :]
        D = np.where(sjalv, np.inf, D)                                                     # a station never corrects itself, nor anchors itself
        res = (st.yta - st.ph).to_numpy(float); yta = st.yta.to_numpy(float); rfin = np.isfinite(res)
        for j in range(n):
            d = D[j]
            # FYSIK+GRANNAR: the 8 nearest finite residuals within 300 km
            c = np.where((d <= RMAX_RES) & rfin)[0]
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
                nank[j] = a.size; spr[j] = yta[a].max() - yta[a].min()
    pg = p.ph.to_numpy(float) + corr
    wb = W * np.exp(-np.nan_to_num(ank, nan=1e9) / L)
    pb = np.where(np.isfinite(ra), wb * ra + (1 - wb) * pg, pg)
    return p.assign(corr=np.round(corr, 3), pg=np.round(pg, 2), ra=np.round(ra, 2), ank_km=np.round(ank, 1), pb=np.round(pb, 2),
                    n_ank=nank, spr=np.round(spr, 1))


def sjalvtest():
    fel = []
    W, L = par()
    if (W, L) != (0.25, 160.0): fel.append(f'paret ur kandidatfilen: {W}, {L}')
    # Three stations on a line (0, 10, 30 km east of the point) and one road point; a fourth station far away (400 km).
    km = 1 / 111.2 / np.cos(np.radians(60))
    st = pd.DataFrame({'punkt': ['A', 'B', 'C', 'D'], 'yta': [-1.0, 0.0, 2.0, 5.0], 'lon': [15.0, 15 + 10 * km, 15 + 30 * km, 15 + 400 * km], 'lat': [60.0] * 4})
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
    # RÅ:s ankare och deras spridning (spridningsgrinden, #474/#575), facit för hand: v0 har A (−1), B (0), C (+2) inom 50 km ⇒ 3 och
    # 3,0 °C; A utan sig själv B (0) och C (+2) ⇒ 2 och 2,0; D inga ⇒ 0 och NaN.
    if not (u.loc['v0', 'n_ank'] == 3 and u.loc['v0', 'spr'] == 3.0 and u.loc['A', 'n_ank'] == 2 and u.loc['A', 'spr'] == 2.0
            and u.loc['D', 'n_ank'] == 0 and np.isnan(u.loc['D', 'spr'])):
        fel.append(f'ankarna och spridningen: v0 {u.loc["v0", "n_ank"]}/{u.loc["v0", "spr"]}, A {u.loc["A", "n_ank"]}/{u.loc["A", "spr"]}, D {u.loc["D", "n_ank"]}/{u.loc["D", "spr"]}')
    # The caps: 12 stations within 20 km with values 1…12 by distance — only the 8 nearest residuals and the 5 nearest anchors count.
    st2 = pd.DataFrame({'punkt': [f's{i}' for i in range(12)], 'yta': [float(i + 1) for i in range(12)], 'lon': [15 + (i + 1) * 1.5 * km for i in range(12)], 'lat': [60.0] * 12})
    p2 = pd.DataFrame({'punkt': ['v1'] + list(st2.punkt), 'lon': [15.0] + [15 + (i + 1) * 1.5 * km for i in range(12)], 'lat': [60.0] * 13, 'ph': [0.0] * 13})
    u2 = timme(p2, st2, W, L).set_index('punkt')
    d8 = np.array([(i + 1) * 1.5 for i in range(8)]); w8 = np.exp(-d8 / 100.0); corr8 = (w8 * np.arange(1, 9)).sum() / (w8.sum() + 0.5)
    if abs(u2.loc['v1', 'corr'] - corr8) > 1e-3: fel.append(f'bara de åtta närmaste felen räknas: {u2.loc["v1", "corr"]} ({corr8:.3f})')
    d5 = np.array([(i + 1) * 1.5 for i in range(5)]); w5 = 1 / np.maximum(d5, 1); ra5 = (w5 * np.arange(1, 6)).sum() / w5.sum()
    if abs(u2.loc['v1', 'ra'] - ra5) > 0.006 or u2.loc['v1', 'ank_km'] != 1.5: fel.append(f'RÅ ur de fem närmaste: {u2.loc["v1", "ra"]} ({ra5:.3f}), ank {u2.loc["v1", "ank_km"]}')
    if not (u2.loc['v1', 'n_ank'] == 5 and u2.loc['v1', 'spr'] == 4.0): fel.append(f'spridningen över de fem: {u2.loc["v1", "n_ank"]}/{u2.loc["v1", "spr"]}')
    # A station without a measurement at the hour is not an anchor and gives no residual; a station with a measurement but
    # without PH (no frozen features, or outside the chain) is an anchor for RÅ but gives no residual — as the replica.
    u3 = timme(p, st[st.punkt != 'A'], W, L).set_index('punkt')
    if u3.loc['v0', 'ank_km'] != 10.0: fel.append(f'en station utan mätning är inget ankare: ank {u3.loc["v0", "ank_km"]}')
    u4 = timme(p[p.punkt != 'B'], st, W, L).set_index('punkt')
    corr_b = (np.exp(-np.array([0, 30]) / 100.0) * np.array([-1, 0.5])).sum() / (np.exp(-np.array([0, 30]) / 100.0).sum() + 0.5)
    if not (abs(u4.loc['v0', 'corr'] - corr_b) <= 1e-3 and abs(u4.loc['v0', 'ra'] - ra) <= 0.01):   # <= så att NaN fälls, inte tiger
        fel.append(f'en station utan PH är ankare men ger inget fel: corr {u4.loc["v0", "corr"]} ({corr_b:.3f}), ra {u4.loc["v0", "ra"]} ({ra:.2f})')
    # Inget NaN får läcka ut i corr, pg eller pb (RÅ får saknas bara utan ankare): ett okänt fel som räknas med ger NaN som tiger i >.
    for namn, x in (('u', u), ('u2', u2), ('u3', u3), ('u4', u4)):
        if x[['corr', 'pg', 'pb']].isna().any().any(): fel.append(f'{namn}: NaN i corr, pg eller pb')
    # The hourly run from files, as kandidat-timme.yml calls it: PH for two points (one without a position is skipped), the
    # positions, two anchors ⇒ live.csv with the hour, every column, and the summary.
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        open(f'{d}/ph.csv', 'w').write('punkt,ph\n1001,0.0\nv00000,1.0\nv99999,5.0\n')
        open(f'{d}/punkter.csv', 'w').write('sid,lon,lat\n1001,15.0,60.0\nv00000,15.0,60.0\n')
        open(f'{d}/ankare.csv', 'w').write(f'punkt,yta,lon,lat\n1001,-1.0,15.0,60.0\nB,0.0,{15 + 10 * km},60.0\n')
        logg = print
        s = kor(f'{d}/ph.csv', f'{d}/punkter.csv', f'{d}/ankare.csv', '2026-10-15T12:00:00Z', f'{d}/live.csv')
        live = pd.read_csv(f'{d}/live.csv', dtype={'punkt': str})
        if not (s['punkter'] == 2 and s['ankare'] == 2 and list(live.columns) == ['tid_utc', 'punkt', 'ph', 'pg', 'ra', 'ank_km', 'pb', 'n_ank', 'spr'] and live.tid_utc.iloc[0] == '2026-10-15T12:00:00Z'
                and set(live.punkt) == {'1001', 'v00000'}):
            fel.append(f'körningen ur filer: {s}, {live.to_dict()}')
        # B (10 km, residual unknown: no PH at B) corrects nothing; v0 gets RÅ from A (0 km) and B.
        v = live.set_index('punkt').loc['v00000']
        if not (v.ank_km == 0.0 and abs(v.ra - (-1.0 * 1 + 0.0 * 0.1) / 1.1) < 0.01): fel.append(f'v0 ur filer: {v.to_dict()}')
        s1 = live.set_index('punkt').loc['1001']
        if not (v.n_ank == 2 and v.spr == 1.0 and s1.n_ank == 1 and s1.spr == 0.0): fel.append(f'ankarna och spridningen ur filer: v0 {v.n_ank}/{v.spr}, 1001 {s1.n_ank}/{s1.spr}')
    for f in fel: print('✗', f)
    if fel: sys.exit(1)
    print('✓ självtest: grannarnas fel (åtta närmaste inom 300 km, exp(−d/100), krympning 0,5, aldrig sig själv), RÅ (fem inom 50 km, 1/max(km, 1)), '
          f'blandningen med paret W {W} · L {L:g} km ur kandidatfilen, taken, en station utan mätning, ankarna och spridningen, och körningen ur filer')


def kor(ph_csv, punkter_csv, ankare_csv, tid, ut):
    """The hourly run: PH at the hour (punkt, ph from kandidat-db ph), the points' positions (indata stations.csv: sid, lon, lat), the
    anchors just now (kandidat-db ankare: punkt, yta, lon, lat) → live.csv for kandidat-db skriv-live. Returns the summary."""
    ph = pd.read_csv(ph_csv, dtype={'punkt': str})
    pos = pd.read_csv(punkter_csv, dtype={'sid': str}).rename(columns={'sid': 'punkt'})[['punkt', 'lon', 'lat']]
    ank = pd.read_csv(ankare_csv, dtype={'punkt': str})[['punkt', 'yta', 'lon', 'lat']]
    p = ph.merge(pos, on='punkt', how='inner')
    if len(p) < len(ph): print(f'  {len(ph) - len(p)} punkter med PH saknar läge i {punkter_csv} och hoppas över')
    W, L = par()
    u = timme(p, ank, W, L)
    u.insert(0, 'tid_utc', tid)
    u[['tid_utc', 'punkt', 'ph', 'pg', 'ra', 'ank_km', 'pb', 'n_ank', 'spr']].to_csv(ut, index=False)
    s = {'tid': tid, 'punkter': int(len(u)), 'ankare': int(len(ank)), 'med_ra': int(u.ra.notna().sum()), 'pb_min': float(u.pb.min()), 'pb_max': float(u.pb.max()),
         'corr_medel': float(u['corr'].mean()), 'W': W, 'L_km': L}            # u.corr vore DataFrame.corr(), metoden
    print(f'kandidaten {tid}: {s["punkter"]} punkter, {s["ankare"]} ankare, RÅ vid {s["med_ra"]}, pb {s["pb_min"]:.1f}–{s["pb_max"]:.1f} °C, grannfelets medel {s["corr_medel"]:+.2f} → {ut}')
    return s


if __name__ == '__main__':
    if '--sjalvtest' in sys.argv:
        sjalvtest(); sys.exit(0)
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--ph', required=True); ap.add_argument('--punkter', required=True); ap.add_argument('--ankare', required=True)
    ap.add_argument('--tid', required=True); ap.add_argument('--ut', required=True)
    a = ap.parse_args()
    kor(a.ph, a.punkter, a.ankare, a.tid, a.ut)
