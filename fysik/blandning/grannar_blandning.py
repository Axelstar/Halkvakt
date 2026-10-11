"""FYSIK+GRANNAR and FYSIK+BLANDNING as files, computed inside the kuvös job by Axel's frozen kuvos_replica.py (DECISIONS #516,
kort #308). The files carry the neighbours' measured surface temperatures, computed row by row from Trafikverket's delivery, so they
never leave the job: no artifact, no release, no row in the log (CLAUDE.md, PUBLIKT REPO; DECISIONS #506). The replica runs
unchanged (its sha256 is in ../SHA256SUMS); this file only puts FYSIK where the replica reads it and writes what it computed.

FYSIK in is the control run's hourly OOF array (kedja.py kontroll, DECISIONS #509), whose sha256 is printed against the frozen
9268c6c7…. Out: one gzip per candidate in the FYSIK file's form (station_id,t_utc,fysik_c, half-hours, two decimals, as
kedja.utdata writes it) and manifest.json in the form scripts/matningar/kuvos-blandning-2026-10-08.ts reads.
  cd /home/claude/fys && python3 blandning/grannar_blandning.py --oof <oof_A2_kontroll.npy> --ut <dir>
  python3 fysik/blandning/grannar_blandning.py --sjalvtest          synthetic data only; runs in ci.yml
"""
import argparse, gzip, hashlib, json, os, runpy, shutil, sys, tempfile
import numpy as np
import pandas as pd

D = '/home/claude/fys'
BUCKET_S = 1800
KANDIDATER = [('PG', 'FYSIK+GRANNAR', 'fysik-grannar-analys-2024-25.csv.gz'),
              ('PB', 'FYSIK+BLANDNING', 'fysik-blandning-analys-2024-25.csv.gz')]


def skriv(P, sids, b0, fil):
    """The candidate's values (half-hour buckets from b0 × stations) as station_id,t_utc,fysik_c, sorted by station and time."""
    r, c = np.nonzero(np.isfinite(P))
    t = pd.to_datetime((b0 + r).astype('int64') * BUCKET_S, unit='s', utc=True).strftime('%Y-%m-%dT%H:%M:%SZ')
    df = pd.DataFrame({'station_id': np.asarray(sids, dtype=object)[c], 't_utc': t,
                       'fysik_c': np.round(P[r, c].astype(float), 2)}).sort_values(['station_id', 't_utc'])
    with gzip.open(fil, 'wt', compresslevel=6, newline='') as fh:      # '\n' on every platform, as kedja.utdata writes
        df.to_csv(fh, index=False, lineterminator='\n')
    return len(df), int(df.station_id.nunique()), hashlib.sha256(open(fil, 'rb').read()).hexdigest()


def manifest(g, ut):
    filer = []
    for var, namn, fil in KANDIDATER:
        rader, stationer, sha = skriv(g[var], g['sids'], g['b0'], f'{ut}/{fil}')
        filer.append({'fil': fil, 'namn': namn, 'lage': 'analys', 'bytes': os.path.getsize(f'{ut}/{fil}'),
                      'rader': rader, 'stationer': stationer, 'sha256': sha})
        print(f'{fil}: {rader} rader, {stationer} stationer, sha256 {sha}', flush=True)
    json.dump({'_om': 'Skrivet i kuvösjobbet av fysik/blandning/grannar_blandning.py ur Axels frysta kuvos_replica.py '
                      '(DECISIONS #516); lämnar aldrig jobbet.', 'filer': filer}, open(f'{ut}/manifest.json', 'w'), indent=1)
    return filer


def sjalvtest():
    fel = []
    sids = ['1002', '1001', '200']
    b0 = int(pd.Timestamp('2025-01-10T00:00:00Z').timestamp()) // BUCKET_S
    P = np.full((3, 3), np.nan, np.float32)
    P[0, 0], P[1, 1], P[2, 1], P[2, 2] = 1.234, -2.5, 0.1, 3.0
    g = {'PG': P, 'PB': P + 1, 'sids': sids, 'b0': b0}
    with tempfile.TemporaryDirectory() as ut:
        filer = manifest(g, ut)
        text = gzip.open(f'{ut}/{KANDIDATER[0][2]}', 'rb').read().decode('utf-8')
        vantat = ('station_id,t_utc,fysik_c\n1001,2025-01-10T00:30:00Z,-2.5\n1001,2025-01-10T01:00:00Z,0.1\n'
                  '1002,2025-01-10T00:00:00Z,1.23\n200,2025-01-10T01:00:00Z,3.0\n')
        if text != vantat: fel.append(f'filen som FYSIK-filen: {text!r}')
        m = json.load(open(f'{ut}/manifest.json'))
        if [f['namn'] for f in m['filer']] != ['FYSIK+GRANNAR', 'FYSIK+BLANDNING']: fel.append('kandidaterna i manifestet')
        for f in m['filer']:
            if not (f['fil'].endswith('.csv.gz') and f['lage'] == 'analys' and len(f['sha256']) == 64
                    and f['rader'] == 4 and f['stationer'] == 3):
                fel.append(f'manifestet: {f}')
        if sorted(os.listdir(ut)) != sorted([k[2] for k in KANDIDATER] + ['manifest.json']): fel.append('bara de tre filerna i --ut')
        if filer[0]['sha256'] == filer[1]['sha256']: fel.append('två kandidater med samma summa')
    for f in fel: print('✗', f)
    if fel: sys.exit(1)
    print('✓ självtest: kandidaterna skrivs i FYSIK-filens form (sorterade, halvtimmar, två decimaler, tomma utelämnade) med ett manifest som mätningen läser')


if __name__ == '__main__':
    if '--sjalvtest' in sys.argv:
        sjalvtest(); sys.exit(0)
    ap = argparse.ArgumentParser()
    ap.add_argument('--oof', required=True)
    ap.add_argument('--ut', required=True)
    a = ap.parse_args()
    os.makedirs(a.ut, exist_ok=True)
    shutil.copyfile(a.oof, f'{D}/oof_A2.npy')
    sha = hashlib.sha256(open(f'{D}/oof_A2.npy', 'rb').read()).hexdigest()
    print(f"FYSIK in i replikan: {a.oof}, sha256 {sha} ({'den frysta' if sha.startswith('9268c6c7') else 'inte byte för byte den frysta 9268c6c7…'})", flush=True)
    g = runpy.run_path(f'{D}/kuvos_replica.py', run_name='__main__')      # the frozen replica, unchanged; prints its own aggregates
    manifest(g, a.ut)
