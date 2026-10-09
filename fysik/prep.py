import pandas as pd, numpy as np, glob, json
na=['-9','-99,9','-99,8','-100','-99.9']
dfs=[]
for f in sorted(glob.glob('/mnt/user-data/uploads/Halkvakt_*.csv')):
    d=pd.read_csv(f,sep=';',decimal=',',encoding='utf-8-sig',na_values=na,dtype={'measurepoint':str,'virik':str},low_memory=False)
    dfs.append(d)
df=pd.concat(dfs,ignore_index=True)
df=df[df.measurepoint.str.strip().str.isdigit()].copy()
df['sid']=df.measurepoint.str.strip()
t=pd.to_datetime(df.measuretime).dt.round('30min')
df['t']=t.dt.tz_localize('Europe/Stockholm',ambiguous='NaT',nonexistent='NaT').dt.tz_convert('UTC').dt.tz_localize(None)
df=df.dropna(subset=['t'])
df=df[['sid','t','tyta','tluft','daggp','lu_fu','ned_typ','ned_maengd','vimed']]
# guards (project): givarvakt, radvakt
bad=((df.tluft-df.tyta)>12)|((df.tluft>=10)&((df.tluft-df.tyta)>=8))|(~df.tyta.between(-45,45))
df['bad']=bad
# karantän: >=3 givarvakt breaches in 7 days -> drop station-week rows (simplified: drop station-days within 7 days after 3rd breach)
df=df.sort_values(['sid','t'])
df.loc[df.bad,'tyta']=np.nan
df=df.drop_duplicates(['sid','t'])
st={x['id']:x for x in json.load(open('data/static.json'))['stations']}
df=df[df.sid.isin(st)]
# hourly: keep :00 rows
h=df[df.t.dt.minute==0].copy()
h.to_parquet('data/vvis_hourly.parquet')
full=df; full.to_parquet('data/vvis_30min.parquet')
ss=sorted(h.sid.unique(),key=int)
meta=pd.DataFrame([{'sid':s,'lon':st[s]['lon'],'lat':st[s]['lat']} for s in ss])
meta.to_csv('data/stations.csv',index=False)
print(len(h),'hourly rows',len(ss),'stations',h.t.min(),h.t.max(), 'bad flagged',int(bad.sum()))
