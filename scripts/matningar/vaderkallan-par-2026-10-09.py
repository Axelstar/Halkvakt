"""Väderkällan, nivå 1 (DECISIONS #504): para varje VViS-station med närmaste SMHI-station inom en gräns (5 km användes 9/10 → 70 par).
Läser metnordic_stationer.csv (release kuvos-metnordic-2024-25) och smhi_p1_2024-25.csv.gz (release kuvos-smhi-2024-25) i <mapp>.
Kör: python3 -I vaderkallan-par-2026-10-09.py <mapp> 5   → <mapp>/par.csv (= data/vaderkallan/stationspar_vviss_smhi.csv)"""
import csv,gzip,math,sys
d=sys.argv[1]
vv=list(csv.DictReader(open(d+'/metnordic_stationer.csv')))
sm={}
for r in csv.DictReader(gzip.open(d+'/smhi_p1_2024-25.csv.gz','rt')):
    sm.setdefault(r['station_id'],(float(r['lat']),float(r['lon'])))
def km(a,b,c,e):
    return 6371*2*math.asin(math.sqrt(math.sin(math.radians(c-a)/2)**2+math.cos(math.radians(a))*math.cos(math.radians(c))*math.sin(math.radians(e-b)/2)**2))
out=csv.writer(open(d+'/par.csv','w')); out.writerow(['vviss','smhi','km','lat','lon','ruta_lat','ruta_lon'])
n=0
for v in vv:
    la,lo=float(v['lat']),float(v['lon'])
    best=min(((km(la,lo,*p),s) for s,p in sm.items()))
    if best[0]<=float(sys.argv[2]): out.writerow([v['station_id'],best[1],round(best[0],2),la,lo,v['ruta_lat'],v['ruta_lon']]); n+=1
print(len(vv),'VViS',len(sm),'SMHI-stationer',n,'par inom',sys.argv[2],'km')
