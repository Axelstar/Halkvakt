"""Väderkällan, nivå 1 (DECISIONS #504): hämtar ECMWF IFS ur Open-Meteos arkiv (CC BY 4.0, Open-Meteo.com / ECMWF) timvis
31/10 2024 – 31/3 2025 för varje punkt i <mapp>/par.csv, en månad per anrop (större svar klipptes i proxyn 9/10). Kan avbrytas och
startas om: färdiga månader hoppas över. Resultatet packades till data/vaderkallan/ecmwf_2024-25.csv.gz.
Kör: python3 -I vaderkallan-hamta-ecmwf-2026-10-09.py <mapp>"""
import csv,json,sys,subprocess,time,os
d=sys.argv[1]; os.makedirs(d+'/ec',exist_ok=True)
par=list(csv.DictReader(open(d+'/par.csv')))
V="temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover,precipitation,shortwave_radiation"
M=[("2024-10-31","2024-11-30"),("2024-12-01","2024-12-31"),("2025-01-01","2025-01-31"),("2025-02-01","2025-02-28"),("2025-03-01","2025-03-31")]
for i,p in enumerate(par):
    for a,b in M:
        f=f"{d}/ec/{p['vviss']}_{a}.json"
        if os.path.exists(f): continue
        u=(f"https://archive-api.open-meteo.com/v1/archive?latitude={p['lat']}&longitude={p['lon']}&start_date={a}&end_date={b}&hourly={V}&models=ecmwf_ifs&wind_speed_unit=ms&timezone=GMT")
        while True:
            r=subprocess.run(['curl','-sS','-m','90',u],capture_output=True,text=True)
            try: j=json.loads(r.stdout); j['hourly']; break
            except Exception: time.sleep(10)
        open(f,'w').write(r.stdout)
    print('station',i+1,'av',len(par),flush=True)
print('KLART',flush=True)
