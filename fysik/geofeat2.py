import os, math
os.environ.update(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', CURL_CA_BUNDLE='/root/.ccr/ca-bundle.crt', GDAL_HTTP_MAX_RETRY='5', GDAL_HTTP_RETRY_DELAY='3')
import numpy as np, pandas as pd, rasterio
from rasterio.merge import merge
from concurrent.futures import ThreadPoolExecutor
from geofeat import dem_url
meta=pd.read_csv('data/stations.csv',dtype={'sid':str})
def f(r):
    lat,lon=r.lat,r.lon; R=20.0
    dlat=R/110.54; dlon=R/(111.32*math.cos(math.radians(lat)))
    b=(lon-dlon,lat-dlat,lon+dlon,lat+dlat)
    urls=sorted({dem_url(int(math.floor(la)),int(math.floor(lo))) for la in np.arange(math.floor(b[1]),b[3]+1e-9,1) for lo in np.arange(math.floor(b[0]),b[2]+1e-9,1)})
    srcs=[]
    for u in urls:
        try: srcs.append(rasterio.open(u, overview_level=1))
        except Exception: pass
    if not srcs: return {'sid':r.sid}
    a,tr=merge(srcs,bounds=b); [s.close() for s in srcs]
    z=a[0].astype(float); z[z<-100]=np.nan
    ny,nx=z.shape; resx=abs(tr.a)*111320*math.cos(math.radians(lat)); resy=abs(tr.e)*110540
    yy,xx=np.mgrid[0:ny,0:nx]; d=np.hypot((yy-ny//2)*resy,(xx-nx//2)*resx)
    z0=np.nanmean(z[d<=300]); o={'sid':r.sid}
    for k in (2,5,10,20): o[f'tpi{k}km']=z0-np.nanmean(z[d<=k*1000])
    o['vdepth5km']=np.nanmax(z[d<=5000])-z0
    o['vdepth10km']=np.nanmax(z[d<=10000])-z0
    return o
with ThreadPoolExecutor(8) as ex: rows=list(ex.map(f,list(meta.itertuples())))
df=pd.DataFrame(rows); df.to_csv('data/geofeat2.csv',index=False); print(df.describe().T)
