import pandas as pd, numpy as np, json, urllib.request, time
meta=pd.read_csv('data/stations.csv',dtype={'sid':str})
# station point + ring points at 1 km and 3 km (8 directions) for TPI
pts=[]
for r in meta.itertuples():
    pts.append((r.sid,'c',r.lat,r.lon))
    for R in (1.0,3.0):
        for a in range(0,360,45):
            dlat=R/111.0*np.cos(np.radians(a)); dlon=R/(111.0*np.cos(np.radians(r.lat)))*np.sin(np.radians(a))
            pts.append((r.sid,f'r{int(R)}',r.lat+dlat,r.lon+dlon))
out=[]
for i in range(0,len(pts),100):
    ch=pts[i:i+100]
    url="https://api.open-meteo.com/v1/elevation?latitude="+",".join(f"{p[2]:.5f}" for p in ch)+"&longitude="+",".join(f"{p[3]:.5f}" for p in ch)
    for att in range(20):
        try: e=json.load(urllib.request.urlopen(url,timeout=60))['elevation']; break
        except Exception as ex: print('retry',ex,flush=True); time.sleep(10)
    out+= [(p[0],p[1],v) for p,v in zip(ch,e)]
    if i%2000==0: print(i,flush=True)
df=pd.DataFrame(out,columns=['sid','k','z'])
c=df[df.k=='c'].set_index('sid').z
r1=df[df.k=='r1'].groupby('sid').z.mean(); r3=df[df.k=='r3'].groupby('sid').z.mean()
el=pd.DataFrame({'elev':c,'tpi1':c-r1,'tpi3':c-r3}).reset_index()
el.to_csv('data/elev.csv',index=False); print(el.describe())
