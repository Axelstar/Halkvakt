"""ECMWF IFS ur Open-Meteos arkiv för en vinter (förregistreringen §2): fysik/fetch_ifs.py med datumen och mapparna som parametrar.

fetch_ifs.py är fryst och låst vid 2024-10-10..2025-03-31 (rad 12). Det här är samma hämtning — samma sju fält (V), samma adress
(models=ecmwf_ifs, wind_speed_unit=ms, timezone=GMT), tio stationer per anrop, samma omförsök och samma fil per station
(hourly + elev_ifs) — med vinterns datum. Självtestet jämför adressen med den frysta filens text, så att de inte kan glida isär.
Stationerna och lägena är indatans (releasen kuvos-fysik-indata-2024-25, stations.csv), som förregistreringen §2 säger.

  python fysik/vintrar/hamta_ifs.py --stationer <stations.csv> --fran 2022-10-10 --till 2023-03-31 --ut <mapp>/ifs
Källa: ECMWF IFS via Open-Meteo (CC BY 4.0).
"""
import argparse, json, os, sys, time, urllib.error, urllib.request
import pandas as pd

V = "temperature_2m,dew_point_2m,wind_speed_10m,cloud_cover,shortwave_radiation,precipitation,snowfall"   # fetch_ifs.py:5
B = 10                                                                                                    # fetch_ifs.py:8


def adress(ch, fran, till):
    """fetch_ifs.py:11–12 med datumen som parametrar."""
    return ("https://archive-api.open-meteo.com/v1/archive?latitude=" + ",".join(f"{r.lat:.4f}" for r in ch) +
            "&longitude=" + ",".join(f"{r.lon:.4f}" for r in ch) +
            f"&start_date={fran}&end_date={till}&hourly={V}&wind_speed_unit=ms&models=ecmwf_ifs&timezone=GMT")


def hamta(url, oppna=urllib.request.urlopen, vanta=time.sleep):
    """fetch_ifs.py:13–21: 30 försök, 65 s efter ett HTTP-fel (429), 20 s efter annat."""
    for att in range(30):
        try:
            return json.load(oppna(url, timeout=120))
        except urllib.error.HTTPError as e:
            msg = e.read()[:200]; print('HTTP', e.code, msg, flush=True); vanta(65)
        except Exception as e:
            print('ERR', e, flush=True); vanta(20)
    sys.exit('gave up')


def kor(stationer, fran, till, ut, oppna=urllib.request.urlopen, vanta=time.sleep):
    meta = pd.read_csv(stationer, dtype={'sid': str})
    os.makedirs(ut, exist_ok=True)
    todo = [r for r in meta.itertuples() if not os.path.exists(f'{ut}/{r.sid}.csv')]
    print('todo', len(todo), flush=True)
    for i in range(0, len(todo), B):
        ch = todo[i:i + B]
        d = hamta(adress(ch, fran, till), oppna, vanta)
        if isinstance(d, dict): d = [d]
        for r, x in zip(ch, d):
            h = pd.DataFrame(x['hourly']); h['elev_ifs'] = x.get('elevation'); h.to_csv(f'{ut}/{r.sid}.csv', index=False)
        print(i + len(ch), 'done', flush=True)
        vanta(1)
    # Formen: varje station samma timmar från fran 00 till till 23, och tomma värden räknade (common.load fyller dem framåt och bakåt).
    vantade = pd.date_range(fran, pd.Timestamp(till) + pd.Timedelta(hours=23), freq='h').strftime('%Y-%m-%dT%H:%M')
    fel, tomma = [], 0
    for s in meta.sid:
        h = pd.read_csv(f'{ut}/{s}.csv')
        if list(h.time) != list(vantade):
            fel.append(s)
        tomma += int(h[V.split(',')].isna().to_numpy().sum())
    print(f'ECMWF {fran}..{till}: {len(meta)} stationer, {len(vantade)} timmar per station, {tomma} tomma värden; '
          f'{len(fel)} stationer med andra timmar {fel[:5]}', flush=True)
    if fel:
        sys.exit('ECMWF: timindexet är inte vinterns — kedjan läser inte filerna')
    return dict(stationer=int(len(meta)), timmar=int(len(vantade)), tomma_varden=tomma)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--stationer', required=True); ap.add_argument('--fran', required=True); ap.add_argument('--till', required=True)
    ap.add_argument('--ut', required=True)
    a = ap.parse_args()
    kor(a.stationer, a.fran, a.till, a.ut)
    print('ALL DONE', flush=True)
