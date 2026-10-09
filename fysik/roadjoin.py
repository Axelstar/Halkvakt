import geopandas as gpd, pandas as pd, numpy as np, sys
g=sys.argv[1]; out=sys.argv[2]
v=gpd.read_file(g,layer='VIS_DK_O_17_VVIS')[['Nummer','Namn','geometry']]
v['sid']=v.Nummer.astype(str)
layers={'VIS_DK_O_95_Vagunderhallsklass':['Vagunderhallsklass'],'NVDB_DK_O_38_FunkVagklass':['Klass'],
        'TRAFIK_DK_O_105_Trafik':['Adt_samtliga_fordon','Adt_tunga_fordon'],'NVDB_DK_O_2_Vaghallare':['Vaghallartyp'],
        'VIS_DK_O_2_Driftomrade':['Entreprenor','Namn'],'NVDB_DK_O_111_Vagnummer':['Europavag','Huvudnummer','Lankroll']}
res=v[['sid','Namn','geometry']].copy()
buf=v.copy(); buf['geometry']=v.buffer(150)
for lyr,cols in layers.items():
    L=gpd.read_file(g,layer=lyr,columns=cols,bbox=tuple(v.total_bounds+np.array([-500,-500,500,500])))
    j=gpd.sjoin_nearest(v[['sid','geometry']],L[cols+['geometry']],how='left',max_distance=150,distance_col='d')
    j=j.sort_values('d').drop_duplicates('sid')
    j=j.rename(columns={c:f'{lyr.split("_")[-1]}_{c}' for c in cols})
    res=res.merge(j.drop(columns=['geometry','index_right'],errors='ignore').rename(columns={'d':f'd_{lyr.split("_")[-1]}'}),on='sid',how='left')
    print(lyr,'matched',res[f'd_{lyr.split("_")[-1]}'].notna().sum(),'of',len(res),flush=True)
res.drop(columns='geometry').to_csv(out,index=False)
