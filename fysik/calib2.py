import numpy as np, time, json, sys
from scipy.optimize import minimize
from common import load, gates
from physics import run, DEFAULT
from sklearn.cluster import KMeans
meta,idx,F,obs,aux=load()
km=KMeans(n_clusters=25,n_init=4,random_state=0).fit(meta[['lon','lat']].to_numpy()*[0.55,1]); fold=km.labels_%5
tr=np.where(fold%2==0)[0]; te=np.where(fold%2==1)[0]   # spatial halves (folds 0,2,4 vs 1,3)
def sub(Fd,ix): return {k:(v[:,ix] if v.ndim==2 else v[ix]) for k,v in Fd.items()}
Ftr,Fte=sub(F,tr),sub(F,te)
base=json.load(open('params_v1.json'))
names=['albedo','cloud_p','ch','hmin','q_traffic','deep_off','sw_fac','lapse','r_snow','alb_snow','cover_swe','cover_t']
x0=np.array([base.get(n,DEFAULT[n]) for n in names]); x0[names.index('r_snow')]=0.1
scale=np.array([0.1,1,0.003,4,10,2,0.5,0.003,0.1,0.2,10,2])
lo=dict(albedo=0.02,cloud_p=0.3,ch=0.0002,hmin=0.2,sw_fac=0,r_snow=0,alb_snow=0.05,cover_swe=0.5)
hi=dict(albedo=0.6,sw_fac=1.5,alb_snow=0.9,r_snow=1.0)
def P(z):
    x=x0+z*scale; p=dict(base); p.update(dict(zip(names,x)))
    for k,v in lo.items(): p[k]=max(p[k],v)
    for k,v in hi.items(): p[k]=min(p[k],v)
    return p
best=[9e9]
def f(z):
    g=gates(obs[:,tr],run(Ftr,P(z))); v=g['A1']+5*g['A2']
    if v<best[0]: best[0]=v; print(round(v,4),round(g['A1'],3),round(g['A2'],3),{k:round(float(P(z)[k]),4) for k in names},flush=True)
    return v
n=len(names); sim=np.vstack([np.zeros(n)]+[np.eye(n)[i]*0.8 for i in range(n)])
r=minimize(f,np.zeros(n),method='Nelder-Mead',options=dict(maxfev=int(sys.argv[1]),xatol=0.01,fatol=1e-5,initial_simplex=sim))
p=P(r.x); json.dump(p,open('params_v2.json','w'))
print('TRAIN',gates(obs[:,tr],run(Ftr,p))); print('TEST (other spatial half)',gates(obs[:,te],run(Fte,p)))
print('TEST v1 params',gates(obs[:,te],run(Fte,base)))
