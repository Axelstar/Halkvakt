"""FYSIK's output for the kuvös: one value per station and half-hour, whole winter, from the frozen oof_A2.npy (sha 9268c6c7…).
No model code runs here — this is extraction. On the hour: the hourly value; on the half-hour: the mean of the two surrounding hours
(as in kuvos_replica.py and FRYS-2026-10-07 'Tidsupplösning'). Winter = 2024-11-01T00:00Z … 2025-03-31T23:30Z.
Writes fysik-2024-25.csv.gz with columns station_id,t_utc,fysik_c and prints row count and sha256."""
import numpy as np, pandas as pd, gzip, hashlib
from common import load
meta, idx, F, obs, aux = load()
P = np.load('oof_A2.npy')
assert hashlib.sha256(open('oof_A2.npy', 'rb').read()).hexdigest().startswith('9268c6c7')
hours = pd.DatetimeIndex(idx)
half = pd.date_range('2024-11-01T00:00:00', '2025-03-31T23:30:00', freq='30min')
df = pd.DataFrame(P, index=hours, columns=meta.sid)
on_hour = df.reindex(half)                                   # NaN on the half-hours
prev = df.reindex(half.floor('h')); prev.index = half
nxt = df.reindex(half.ceil('h')); nxt.index = half
mid = (prev + nxt) / 2
cond = np.broadcast_to(np.asarray(half.minute == 0)[:, None], on_hour.shape)
out = pd.DataFrame(np.where(cond, on_hour.to_numpy(), mid.to_numpy()), index=half, columns=meta.sid)
long = out.stack(future_stack=True).rename('fysik_c').reset_index()
long.columns = ['t_utc', 'station_id', 'fysik_c']
long = long.dropna(subset=['fysik_c'])
long['t_utc'] = long.t_utc.dt.strftime('%Y-%m-%dT%H:%M:%SZ')
long['fysik_c'] = long.fysik_c.round(2)
long = long[['station_id', 't_utc', 'fysik_c']].sort_values(['station_id', 't_utc'])
with gzip.open('fysik-2024-25.csv.gz', 'wt', compresslevel=6) as fh:
    long.to_csv(fh, index=False)
print('rows', len(long), 'stations', long.station_id.nunique(), 'half-hours', long.t_utc.nunique(), 'first', long.t_utc.min(), 'last', long.t_utc.max())
print('sha256 fysik-2024-25.csv.gz', hashlib.sha256(open('fysik-2024-25.csv.gz', 'rb').read()).hexdigest())
