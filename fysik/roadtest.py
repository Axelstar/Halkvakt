import numpy as np, pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import RidgeCV
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import make_column_transformer
from sklearn.pipeline import make_pipeline
from sklearn.cluster import KMeans
from common import load, gates
meta,idx,F,obs,aux=load()
R=pd.read_csv('data/road_mitt.csv',dtype={'sid':str}).drop_duplicates('sid').set_index('sid')
B=np.load('B_sp.npy'); res=obs-B
mon=np.array([t.month for t in idx])
def fp(m):
    r=np.where(m&np.isfinite(res)&(obs<=5),res,np.nan); n=np.isfinite(r).sum(0); return np.where(n>=20,np.nanmean(r,0),np.nan)
f_learn=fp(((mon==11)|(mon==12))[:,None]); f_all=fp(np.ones((len(idx),1),bool))
sel=meta.sid.isin(R.index).to_numpy()
d=R.loc[meta.sid[sel]].copy(); d['f']=f_learn[sel]; d['f_all']=f_all[sel]
d['adt_log']=np.log10(d.Trafik_Adt_samtliga_fordon.clip(lower=10))
d['heavy_share']=d.Trafik_Adt_tunga_fordon/d.Trafik_Adt_samtliga_fordon
print('stations',len(d),'fingerprint sd %.2f'%d.f_all.std())
for col in ['Vagunderhallsklass_Vagunderhallsklass','FunkVagklass_Klass','Driftomrade_Entreprenor','Vagnummer_Europavag']:
    g=d.groupby(col).f_all.agg(['count','mean','std']).round(2); print('\n',g)
d['adt_bin']=pd.cut(d.Trafik_Adt_samtliga_fordon,[0,1000,3000,8000,20000,1e7]); print('\n',d.groupby('adt_bin',observed=True).f_all.agg(['count','mean','std']).round(2))
# predictive test with spatial folds
m2=meta[sel].reset_index(drop=True)
km=KMeans(n_clusters=15,n_init=4,random_state=0).fit(m2[['lon','lat']].to_numpy()*[0.55,1]); fold=km.labels_%5
num=['adt_log','heavy_share']; cat=['Vagunderhallsklass_Vagunderhallsklass','FunkVagklass_Klass','Driftomrade_Entreprenor']
X=d[num+cat].copy(); X[cat]=X[cat].astype(str)
y=d.f.to_numpy(); ok=np.isfinite(y)
p=np.full(len(y),np.nan)
for k in range(5):
    tr=(fold!=k)&ok; te=fold==k
    mdl=make_pipeline(make_column_transformer((StandardScaler(),num),(OneHotEncoder(handle_unknown='ignore'),cat)),RidgeCV(alphas=np.logspace(-1,3,20)))
    mdl.fit(X[tr],y[tr]); p[te]=mdl.predict(X[te])
r2=1-np.nansum((y-p)**2)/np.nansum((y[ok]-y[ok].mean())**2); print('\nheld-out regions: fingerprint R2 from road data = %.3f, corr %.2f'%(r2,np.corrcoef(y[ok],p[ok])[0,1]))
test=((mon>=1)&(mon<=3))[:,None]&np.zeros_like(obs,bool); test[:,np.where(sel)[0]]=((mon>=1)&(mon<=3))[:,None]
Pp=B.copy(); Pp[:,np.where(sel)[0]]+=np.nan_to_num(p)[None,:]
Po=B.copy(); Po[:,np.where(sel)[0]]+=np.nan_to_num(y)[None,:]
print('Jan-Mar gross errors, middle region: model %.1f%% | + road-predicted fingerprint %.1f%% | + measured fingerprint %.1f%%'%(100*gates(obs,B,test)['A2'],100*gates(obs,Pp,test)['A2'],100*gates(obs,Po,test)['A2']))
