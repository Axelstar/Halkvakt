// Kuvösen steg 4 (DECISIONS #441): tif-kompositen mot h5-kompositen PIXEL FÖR PIXEL vid samma tidpunkt. Samma punkt (lat/lon på ett
// gitter över Sverige) läses ur båda rutnäten; där båda ser eko skrivs tif−h5 per h5-band. Mätt 2/10 2026: tif ligger 8–10 enheter
// (≈ 3,4 dBZ) över h5 i alla band, och ser fler svaga eko. Kör: node --experimental-strip-types scripts/matningar/kuvos-radar-tif-h5-2026-10-02.ts
import h5wasm from "h5wasm"; import proj4 from "proj4";
import { lasTif, pixel, TIF_PROJ } from "../../kuvos/tif.ts";
const M:any=await h5wasm.ready; const tt=proj4("EPSG:4326",TIF_PROJ);
const byA=new Map<number,number[]>(); let echoBoth=0, onlyH5=0, onlyTif=0;
for (const dag of ["2026/09/27","2026/09/28","2026/09/29","2026/09/30","2026/10/01"]) for (const hh of ["00","04","08","12","16","20"]) {
 const base=`https://opendata-download-radar.smhi.se/api/version/latest/area/sweden/product/comp/${dag}`; const ymd=dag.replaceAll("/","");
 const h=await fetch(`${base}/radar_sweden_comp_${ymd}${hh}00.h5`); const t=await fetch(`${base}/radar_${ymd.slice(2)}${hh}00.tif`); if(!h.ok||!t.ok){console.log("saknas",dag,hh);continue;}
 M.FS.writeFile("r.h5", new Uint8Array(await h.arrayBuffer()));
 const f=new h5wasm.File("r.h5","r"); const w:any=f.get("where"); const A=(n:string)=>Number(w.attrs[n].value);
 const g=proj4("EPSG:4326",String(w.attrs.projdef.value)); const [xll]=g.forward([A("LL_lon"),A("LL_lat")]); const [,yur]=g.forward([A("UR_lon"),A("UR_lat")]);
 const ds:any=f.get("dataset1/data1/data"); const d=ds.value; const [rows,cols]=ds.shape; const T=lasTif(new Uint8Array(await t.arrayBuffer()));
 for(let lat=55.3;lat<69;lat+=0.04)for(let lon=11;lon<24;lon+=0.07){
  const [x,y]=g.forward([lon,lat]); const c=Math.floor((x-xll)/2000), r=Math.floor((yur-y)/2000); if(c<0||c>=cols||r<0||r>=rows)continue;
  const a=d[r*cols+c]; const [X,Y]=tt.forward([lon,lat]); const b=pixel(T,X,Y); if(b===null||a===255||b===255)continue;
  if(a>0&&b>0){echoBoth++; if(!byA.has(a))byA.set(a,[]); byA.get(a)!.push(b);} else if(a>0) onlyH5++; else if(b>0) onlyTif++;
 }
 f.close();
}
const med=(v:number[])=>{const s=[...v].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
console.log("eko i båda",echoBoth,"bara h5",onlyH5,"bara tif",onlyTif);
for(const lo of [60,70,80,90,100,110,120,130,140]){const v:number[]=[];for(const [a,bs] of byA) if(a>=lo&&a<lo+10) v.push(...bs.map(b=>b-a)); if(v.length) console.log(`h5 ${lo}-${lo+9} (${(lo*0.4-30).toFixed(0)} dBZ): n=${v.length} median tif−h5 = ${med(v)}`);}
