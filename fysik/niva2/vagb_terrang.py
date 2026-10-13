"""Väg B varv 2, körning 2 (DECISIONS #549, kort #321, #342): vagb.py's honest procedure with the terrain and the traffic in the
energy balance (terrang.run_terrang) and eleven calibrated parameters (kedja.KAL_NAMN + q_trafik_adt, starting at 0).

  cd /home/claude/fys && python3 niva2/vagb_terrang.py --metnordic <analysis.csv.gz> --prognos '<dir>/metnordic_prognos_*.csv.gz' --ut <dir>

vagb.py and kedja.py are not changed: koppla() rebinds, in this process only, the names their functions look up when they run — the
physics (run_lw → run_terrang), the calibrated names and their simplex scales, and the start values (physics.DEFAULT + q_trafik_adt 0).
Everything else — the folds, the calibration protocol (Nelder–Mead, A1 + 5·A2, maxfev 120), the features, the correction and the
forecast restarts — is vagb.arlig's. The self-test (sjalvtest.py) proves that with neutral terrain the coupled chain gives vagb.arlig's
estimates byte for byte, and that fold 0's estimates stand still when fold 0's measurements change.
Out (in --ut, never outside the job): oof_terrang_analys.npy, oof_terrang_prognos6.npy, veck_terrang.json, params_terrang_veck<f>.json.
"""
import argparse, glob, json, os, sys
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.dirname(HERE)]
import common
import kedja, vagb
from physics import DEFAULT
from terrang import run_terrang, terrang, tidsprov, adt_fordon
from kedja import rapport, logg
from prognos import las_prognos, vader

KAL_NAMN = kedja.KAL_NAMN + ['q_trafik_adt']
KAL_SKALA = np.append(kedja.KAL_SKALA, 5.0)           # W/m² per tenfold traffic; the simplex starts 0.8 · 5 from 0
START = dict(DEFAULT, q_trafik_adt=0.0)


def koppla():
    kedja.run_lw = vagb.run_lw = run_terrang
    kedja.KAL_NAMN, kedja.KAL_SKALA = KAL_NAMN, KAL_SKALA
    kedja.DEFAULT = vagb.DEFAULT = START


def kor(mn, prognosfiler, ut, maxfev):
    from metnordic import load_mn
    meta, idx, F, obs, aux, t0 = load_mn(mn)
    lat = meta.lat.to_numpy()
    logg(f"väg B varv 2, körning 2 (#549): {len(meta)} stationer, {len(idx)} timmar, MET Nordics analys från {t0}; terrängen och "
         "trafiken i energibalansen, elva parametrar, varje veck räknas bara med de andra fyra")
    F, n = terrang(F, idx, meta, f'{common.D}/geofeat.csv')
    logg(f"terrängen: {n['stationer']} stationer; svf saknas för {n['utan_svf']} (satt till 1), horisonten för {n['utan_horisont']} "
         f"(satt till 0), ÅDT för {n['utan_adt']} (trafiktermen faller bort), {n['adt_under_golvet']} under 10 fordon (satt till 10)")
    logg(f"  svf median {np.median(F['svf']):.3f} (min {F['svf'].min():.3f}); södra horisonten median {np.median(F['horisont']):.2f}° "
         f"(max {F['horisont'].max():.2f}°); log10(ÅDT/1000) median {np.median(F['adt']):.2f} ({np.quantile(F['adt'], 0.1):.2f}–{np.quantile(F['adt'], 0.9):.2f})")
    Rd = pd.read_csv(f'{common.D}/road_all.csv', dtype={'sid': str}).drop_duplicates('sid').set_index('sid').reindex(meta.sid)
    ra = np.log10(Rd.Trafik_Adt_samtliga_fordon.clip(lower=10).to_numpy(float)) - 3
    m = np.isfinite(ra) & np.isfinite(adt_fordon(meta))
    logg(f"  ÅDT mot kedjans road_all.csv (särdraget adt_log) på {int(m.sum())} stationer: korrelation {np.corrcoef(ra[m], F['adt'][m])[0, 1]:.3f}, "
         f"median skillnad {np.median(F['adt'][m] - ra[m]):+.3f} i log10")
    fore, efter = tidsprov(F, idx, meta)
    logg(f"tidsprovet: kortvågen mot solen mitt i timmen före tidsstämpeln r = {fore:.4f}, timmen efter r = {efter:.4f}")
    if not fore > efter:
        sys.exit('vagb_terrang: kortvågen följer solen i timmen EFTER tidsstämpeln bättre — timmarna är förskjutna, inget räknas (#549)')
    korningar, A = las_prognos(prognosfiler, list(meta.sid))
    V, brus = vader(A); del A
    koppla()
    P_an, P_6, TS_an, fold, params = vagb.arlig(meta, idx, F, obs, korningar, V, maxfev)
    for f, p in enumerate(params):
        json.dump(p, open(f'{ut}/params_terrang_veck{f}.json', 'w'))
        logg(f"veck {f}: q_trafik_adt {p['q_trafik_adt']:+.3f} W/m² per tiopotens, q_traffic {p['q_traffic']:+.3f} W/m²")
    json.dump({str(s): int(v) for s, v in zip(meta.sid, fold)}, open(f'{ut}/veck_terrang.json', 'w'))
    np.save(f'{ut}/oof_terrang_analys.npy', P_an)
    np.save(f'{ut}/oof_terrang_prognos{vagb.LEDTID}.npy', P_6)
    rapport('körning 2 fysik ensam (analys)', obs, TS_an, lat)
    rapport('körning 2 fysik + rättelse (analys)', obs, P_an, lat)
    rapport(f'körning 2 fysik + rättelse, +{vagb.LEDTID} h', obs, P_6, lat)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--metnordic', required=True)
    ap.add_argument('--prognos', required=True, help="glob för prognosfilerna")
    ap.add_argument('--ut', required=True)
    ap.add_argument('--maxfev', type=int, default=120)
    a = ap.parse_args()
    os.makedirs(a.ut, exist_ok=True)
    kor(a.metnordic, glob.glob(a.prognos), a.ut, a.maxfev)
    logg('klart')
