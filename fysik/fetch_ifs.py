import pandas as pd, numpy as np, json, time, urllib.request, urllib.error, os, sys
meta=pd.read_csv('data/stations.csv',dtype={'sid':str})
os.makedirs('data/ifs',exist_ok=True)
V="temperature_2m,dew_point_2m,wind_speed_10m,cloud_cover,shortwave_radiation,precipitation,snowfall"
todo=[r for r in meta.itertuples() if not os.path.exists(f'data/ifs/{r.sid}.csv')]
print('todo',len(todo),flush=True)
B=10
for i in range(0,len(todo),B):
    ch=todo[i:i+B]
    url=("https://archive-api.open-meteo.com/v1/archive?latitude="+",".join(f"{r.lat:.4f}" for r in ch)+
         "&longitude="+",".join(f"{r.lon:.4f}" for r in ch)+
         f"&start_date=2024-10-10&end_date=2025-03-31&hourly={V}&wind_speed_unit=ms&models=ecmwf_ifs&timezone=GMT")
    for att in range(30):
        try:
            d=json.load(urllib.request.urlopen(url,timeout=120)); break
        except urllib.error.HTTPError as e:
            msg=e.read()[:200]; print('HTTP',e.code,msg,flush=True); time.sleep(65)
        except Exception as e:
            print('ERR',e,flush=True); time.sleep(20)
    else: sys.exit('gave up')
    if isinstance(d,dict): d=[d]
    for r,x in zip(ch,d):
        h=pd.DataFrame(x['hourly']); h['elev_ifs']=x.get('elevation'); h.to_csv(f'data/ifs/{r.sid}.csv',index=False)
    print(i+len(ch),'done',flush=True)
    time.sleep(1)
print('ALL DONE',flush=True)
