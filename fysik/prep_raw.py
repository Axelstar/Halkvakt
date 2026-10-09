import pandas as pd, numpy as np, glob, json
na=['-9','-99,9','-99,8','-100','-99.9']
dfs=[]
for f in sorted(glob.glob('/mnt/user-data/uploads/Halkvakt_*.csv')):
    d=pd.read_csv(f,sep=';',decimal=',',encoding='utf-8-sig',na_values=na,dtype={'measurepoint':str,'virik':str},low_memory=False)
    dfs.append(d[['measurepoint','measuretime','tyta','tluft']])
df=pd.concat(dfs,ignore_index=True)
df=df[df.measurepoint.str.strip().str.isdigit()].copy(); df['sid']=df.measurepoint.str.strip()
t=pd.to_datetime(df.measuretime)
df['t']=t.dt.tz_localize('Europe/Stockholm',ambiguous='NaT',nonexistent='NaT').dt.tz_convert('UTC').dt.tz_localize(None)
df=df.dropna(subset=['t'])[['sid','t','tyta','tluft']].sort_values(['sid','t'])
df.to_parquet('data/vvis_30min_raw.parquet'); print(len(df), df.tyta.isna().sum())
