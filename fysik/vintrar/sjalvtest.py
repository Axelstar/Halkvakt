"""Självtestet för vintrarnas kedja (fysik/vintrar/), på påhittade data — ingen rad ur Trafikverkets leverans. Körs i ci.yml.
  python fysik/vintrar/sjalvtest.py
Prövar:
  1. talen och reglerna mot sina källor (grind-a.ts, snapshot-core.ts, sql/030, kuvösens WHERE, prep.py, oversattning.sql,
     fetch_ifs.py, kuvos_replica.py, kandidatfilen och förregistreringen), så att inget kopierat tal kan glida;
  2. läsaren: den frysta prep.py körd på 2024/25-formen ger samma timtabell som lasare.prep_tabell; den nya formen (12 kolumner,
     millisekunder, BOM, SSMS-sidfoten, packad och opackad) med dubbletter i filskarven, läsfönstret och platshållarna; vinterurvalet;
  3. vakterna vid sina gränser (#75, radvakten, karantänens (t − 7 d, t], den långsamma vaktens 24 rader och 90 %, senaste raden);
  4. RÅ och måtten mot grind-a.ts egna evaluate() och stats() (node), punkt för punkt;
  5. halvtimmen mot kuvos_replica.py:s slinga;
  6. blandningen: PB är timme():s, stationens egen mätning flyttar inte dess PB men en grannes gör, och replikans urval räknas;
  7. sammanslagningen ur summorna;
  8. ECMWF-adressen mot fetch_ifs.py:s text, och filerna;
  9. tidszonsprovet mot SMHI (toppen vid 0 h; en timmes förskjutning fälls);
 10. hela körningen för en äldre vinter, och motproven: identitetsprovet som faller (A2, n), tidszonen (SMHI, sommartiden) och MET
     Nordic utan långvåg stoppar alla läsningen, och ingen äldre vinter läses utan ett klarat identitetsprov i samma körning.
"""
import gzip, hashlib, json, math, os, pickle, re, shutil, subprocess, sys, tempfile, time, types
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
FYS = os.path.dirname(HERE)
ROT = os.path.dirname(FYS)
sys.path[:0] = [HERE, os.path.join(FYS, 'niva2'), FYS, os.path.join(FYS, 'live')]
import lasare, matt, tidszon, hamta_ifs, vinterkedja
from kandidat_timme import timme, par
from metnordic import FALT

fel = []
T0 = time.time()


def k(ok, msg):
    if not ok:
        fel.append(msg)


def text(rel):
    return open(os.path.join(ROT, rel), encoding='utf-8').read()


# ── 1. Talen mot källorna ────────────────────────────────────────────────────────────────────────────────────────────────────────
def kallorna():
    ga = text('publish/grind-a.ts')
    for namn, mitt in (('K_NEIGHBOURS', matt.K_NEIGHBOURS), ('MAX_KM', matt.MAX_KM), ('MIN_SHARED', matt.MIN_SHARED), ('BUCKET_S', matt.BUCKET_S)):
        m = re.search(rf'const {namn} = (\d+);', ga)
        k(m and float(m[1]) == mitt, f'grind-a.ts {namn} {m and m[1]} ≠ {mitt}')
    band = [(n, float(lo), float(hi.replace('Infinity', 'inf'))) for n, lo, hi in re.findall(r'\["([^"]+)", (\d+), (\d+|Infinity)\]', ga)]
    k(band == [(n, float(lo), float(hi)) for n, lo, hi in matt.BANDS], f'grind-a.ts BANDS {band}')
    k('e.ankKm >= lo && e.ankKm < hi' in text('scripts/matningar/kuvos-blandning-2026-10-08.ts'), 'banden är lo ≤ ank < hi i kuvösen')
    sc = text('publish/snapshot-core.ts')
    for namn, mitt in (('GIVARFEL_LUFT_MIN_C', matt.GIVARFEL_LUFT_MIN_C), ('GIVARFEL_GAP_C', matt.GIVARFEL_GAP_C),
                       ('KARANTAN_DYGN', matt.KARANTAN_DYGN), ('KARANTAN_BROTT', matt.KARANTAN_BROTT)):
        m = re.search(rf'export const {namn} = (\d+);', sc)
        k(m and int(m[1]) == mitt, f'snapshot-core.ts {namn} {m and m[1]} ≠ {mitt}')
    k("k.sample_time <= ${rad}.sample_time AND k.sample_time > ${rad}.sample_time - interval '${KARANTAN_DYGN} days'" in sc
      and 'k.air_temp_c IS NOT NULL AND k.surface_temp_c < k.air_temp_c - 12' in sc, 'karantänens fönster (t − 7 d, t] och brottet')
    kb = text('scripts/matningar/kuvos-blandning-2026-10-08.ts')
    k(f'air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - {matt.GIVARVAKT_C}' in kb and 'DISTINCT ON (station_id, b)' in kb
      and 'ORDER BY station_id, b, sample_time DESC' in kb and '${RADVAKT_SQL} AND ${karantanSql("weather_observations")}' in kb,
      'kuvösens WHERE: #75 med luft, radvakten, karantänen, senaste raden per halvtimme')
    s30 = text('sql/030_langsam_vakt.sql')
    k(f'(air_temp_c - surface_temp_c >= {matt.LANGSAM_GAP_C})::int' in s30 and f'n24 >= {matt.LANGSAM_MIN} AND stort24 >= 0.{matt.LANGSAM_TIONDELAR} * n24' in s30
      and "RANGE BETWEEN interval '24 hours' PRECEDING AND CURRENT ROW" in s30, 'den långsamma vakten (sql/030)')
    rp = text('fysik/kuvos_replica.py')
    k('cand = cand[np.argsort(d[cand])][:K_RES * 4]' in rp and 'K_RES, RMAX_RES, SHRINK = 100.0, 8, 300.0, 0.5' in rp
      and matt.REPLIKANS_NARMASTE == 32, 'replikans 32 närmaste')
    k("na=['-9','-99,9','-99,8','-100','-99.9']" in text('fysik/prep.py') and lasare.NA_PREP == ['-9', '-99,9', '-99,8', '-100', '-99.9'], 'prep.py:s platshållare')
    ov = text('kuvos/oversattning.sql')
    k('nullif(r.tyta, -99.9)' in ov and 'nullif(r.tluft, -99.9)' in ov and "r.measuretime AT TIME ZONE 'Europe/Stockholm'" in ov
      and lasare.SENTINEL_MILLI == -99900, 'översättningens nullif och tidszon')
    fi = text('fysik/fetch_ifs.py')
    k(f'V="{hamta_ifs.V}"' in fi and f'B={hamta_ifs.B}' in fi, 'fetch_ifs.py:s fält och antal per anrop')
    rad = re.search(r'f"(&start_date=2024-10-10&end_date=2025-03-31&hourly=\{V\}[^"]+)"', fi)
    ch = [types.SimpleNamespace(lat=59.3, lon=18.0)]
    k(rad and hamta_ifs.adress(ch, '2024-10-10', '2025-03-31').endswith(rad[1].replace('{V}', hamta_ifs.V)), 'ECMWF-adressen som fetch_ifs.py:s')
    kand = json.load(open(os.path.join(ROT, 'kuvos', 'kandidat-2026-27.json'), encoding='utf-8'))
    u = kand['i_urvalet']['fysik_rattelse']
    k(u['n'] == 2210532 and round(u['A1'], 5) == 0.46477 and round(100 * u['A2'], 4) == 1.4449, f'kandidatfilens i_urvalet {u}')
    fr = text('docs/FORREGISTRERING-FLER-VINTRAR.md')
    k('A1 0,46477 °C och A2 1,4449 %, på n = 2 210 532' in fr and 'A1 ± 0,01 °C och A2 ± 0,02 procentenheter' in fr
      and vinterkedja.TOL_A1 == 0.01 and vinterkedja.TOL_A2 == 0.0002, 'identitetsprovets krav och tolerans ur förregistreringen')
    dagar = [lasare.vinter(v)['sommartid'] for v in lasare.VINTRAR]
    k([f'{d.day}/{d.month} {d.year}' for d in dagar] == ['31/3 2019', '29/3 2020', '28/3 2021', '27/3 2022', '26/3 2023']
      and '31/3 2019, 29/3 2020, 28/3 2021, 27/3 2022, 26/3 2023' in fr, f'sommartidsnätterna {dagar}')
    k(par() == (0.25, 160.0), f'paret ur kandidatfilen {par()}')
    tz = text('scripts/matningar/kuvos-tidszon-2026-10-02.py')
    k('BAND = [(55, 57.5), (57.5, 60), (60, 62.5), (62.5, 65), (65, 69)]' in tz and 'if d <= 8:' in tz and 'if per_band[i] == 2: continue' in tz
      and 'if len(a) > 100 else' in tz and 'for k in range(-3, 4):' in tz and tidszon.BAND == [(55, 57.5), (57.5, 60), (60, 62.5), (62.5, 65), (65, 69)]
      and (tidszon.MAX_KM, tidszon.PER_BAND) == (8, 2), 'tidszonsprovets urval och förskjutningar som kuvos-tidszon-2026-10-02.py')


# ── Påhittade leveranser ──────────────────────────────────────────────────────────────────────────────────────────────────────────
SIDS = ['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008']
LAT = np.array([56.0, 56.2, 58.5, 58.7, 61.0, 61.2, 63.5, 66.0])
LON = np.array([13.5, 13.6, 14.0, 14.1, 15.0, 15.1, 16.0, 20.0])
RUBRIK_NY = 'measurepoint;measuretime;tyta;tluft;daggp;lu_fu;ned_typ;ned_maengd;vimax;vimed;virik;vind30'
RUBRIK_GAMMAL = RUBRIK_NY + ';siktdjup'
SIDFOT = '\n(12 rows affected)\n\nCompletion time: 2026-10-21T15:29:00.1234567+02:00\n\n'


def komma(x):
    return f'{x:.1f}'.replace('.', ',')


def luften(sid, t_utc):
    """Påhittad luft (°C) vid en UTC-tid: dygnsgång, en långsam våg och en slumpvandring per station (samma för VViS och SMHI)."""
    i = SIDS.index(sid); h = (pd.Timestamp(t_utc) - pd.Timestamp('2022-10-01')).total_seconds() / 3600
    return -1 + 3 * math.sin(2 * math.pi * h / 24) + 2 * math.sin(2 * math.pi * h / 127 + i) + 1.5 * math.sin(h * 0.71 + 2 * i) * math.cos(h * 0.13)


def rad(sid, lokal, tyta=None, ny=True, sek='00'):
    """En leveransrad i lokal tid; ytan följer luften."""
    utc = pd.Timestamp(lokal).tz_localize('Europe/Stockholm', ambiguous=False, nonexistent='shift_forward').tz_convert('UTC').tz_localize(None)
    luft = luften(sid, utc.floor('h'))
    yta = luft - 1.5 + 0.2 * math.sin(SIDS.index(sid) + utc.hour) if tyta is None else tyta
    stampel = pd.Timestamp(lokal).strftime('%Y-%m-%d %H:%M:') + sek + ('.000' if ny else '')
    falt = [sid, stampel, komma(yta) if isinstance(yta, float) else yta, komma(luft), komma(luft - 2), '90', '1', '0', '3,1', '2,2', 'N ', '2,4']
    return ';'.join(falt + ([] if ny else ['20000']))


def skriv(fil, rubrik, rader, packa=False):
    innehall = '﻿' + rubrik + '\n' + '\n'.join(rader) + SIDFOT
    if packa:
        with gzip.open(fil, 'wt', encoding='utf-8', newline='') as fh: fh.write(innehall)
    else:
        with open(fil, 'w', encoding='utf-8', newline='') as fh: fh.write(innehall)


def leverans_2024_25(mapp, extra=True):
    """Fem månadsfiler i 2/10-formen (13 kolumner, inga millisekunder); halvtimmarna 1–7/11 och en rad i varje annan månad."""
    os.makedirs(mapp, exist_ok=True)
    rader = []
    for t in pd.date_range('2024-11-01 00:00', '2024-11-07 23:30', freq='30min'):
        for s in SIDS: rader.append(rad(s, t, ny=False, sek='03'))
    rader.append(rad('1001', '2024-11-03 10:00', tyta='-99,9', ny=False, sek='04'))                  # en andra rad samma halvtimme
    rader.append(rad('1002', '2024-11-03 10:30', tyta=-14.0, ny=False))                               # 'bad' i prep.py
    if extra: rader.append(rad('1001', '2024-11-03 11:00', ny=False).replace('1001;', '1999;', 1))   # en station utanför listan
    skriv(os.path.join(mapp, 'Halkvakt_2411.csv'), RUBRIK_GAMMAL, rader)
    for m, d in (('2412', '2024-12-01 12:00'), ('2501', '2025-01-01 12:00'), ('2502', '2025-02-01 12:00'), ('2503', '2025-03-01 12:00')):
        skriv(os.path.join(mapp, f'Halkvakt_{m}.csv'), RUBRIK_GAMMAL, [rad('1001', d, ny=False, sek='03')])


def leverans_2022_23(mapp, natt_02=False):
    """Vintern 2022/23 i 21/10-formen: Halkvakt_2022-2.csv (opackad) och Halkvakt_2023-1.csv.gz, 12 kolumner, millisekunder."""
    os.makedirs(mapp, exist_ok=True)
    host = [rad(s, '2022-10-31 23:30') for s in SIDS]                                                 # före fönstret
    for t in pd.date_range('2022-11-01 00:00', '2022-11-08 23:30', freq='30min'):
        for s in SIDS: host.append(rad(s, t, sek='00' if t.minute else '03'))
    host.append(rad('1003', '2022-11-20 10:00', tyta='-9', sek='20'))                                 # −9: NaN i prep, −9 °C i raderna
    skarv = [rad('1001', '2022-12-31 23:30'), rad('1001', '2023-01-01 00:00'), rad('1002', '2023-01-01 00:00', tyta=-1.0)]
    vinter = [rad('1001', '2023-01-01 00:00'), rad('1002', '2023-01-01 00:00', tyta=-2.0)]          # 1001 lika, 1002 olika
    for t in pd.date_range('2023-03-26 00:00', '2023-03-26 09:30', freq='30min'):
        if t.hour == 2 and not natt_02: continue
        for s in SIDS: vinter.append(rad(s, t))
    vinter += [rad('1001', '2023-03-31 23:30'), rad('1001', '2023-04-01 00:00')]                       # sista i fönstret, första efter
    skriv(os.path.join(mapp, 'Halkvakt_2022-2.csv'), RUBRIK_NY, host + skarv)
    skriv(os.path.join(mapp, 'Halkvakt_2023-1.csv.gz'), RUBRIK_NY, vinter, packa=True)


def fasta(d):
    rng = np.random.default_rng(3); ns = len(SIDS)
    pd.DataFrame({'sid': SIDS, 'lon': LON, 'lat': LAT}).to_csv(f'{d}/stations.csv', index=False)
    pd.DataFrame({'sid': SIDS, 'elev': 50 + 300 * rng.random(ns), 'tpi1': rng.normal(0, 5, ns), 'tpi3': rng.normal(0, 10, ns)}).to_csv(f'{d}/elev.csv', index=False)
    pd.DataFrame({'sid': SIDS, 'Trafik_Adt_samtliga_fordon': 10 ** (2 + 2 * rng.random(ns)), 'Trafik_Adt_tunga_fordon': 50 + 500 * rng.random(ns),
                  'Vagunderhallsklass_Vagunderhallsklass': rng.integers(1, 6, ns), 'FunkVagklass_Klass': rng.integers(0, 10, ns),
                  'Vagnummer_Europavag': rng.choice(['Ja', 'Nej'], ns)}).to_csv(f'{d}/road_all.csv', index=False)
    pd.DataFrame({'sid': SIDS, **{c: rng.random(ns) for c in ['svf', 'horizon_south', 'tree100', 'chm30', 'water1000', 'built300']}}).to_csv(f'{d}/geofeat.csv', index=False)
    pd.DataFrame({'sid': SIDS, **{c: rng.normal(0, 20, ns) for c in ['tpi2km', 'tpi5km', 'tpi10km', 'tpi20km', 'vdepth5km', 'vdepth10km']}}).to_csv(f'{d}/geofeat2.csv', index=False)


def ecmwf(mapp, fran, till, hojd=0.0):
    os.makedirs(mapp, exist_ok=True)
    idx = pd.date_range(fran, pd.Timestamp(till) + pd.Timedelta(hours=23), freq='h')
    h = np.arange(len(idx))
    for i, s in enumerate(SIDS):
        ta = np.array([luften(s, t) for t in idx]); cloud = 0.5 + 0.4 * np.sin(h / 17.0 + i)
        pr = np.where(np.sin(h / 5.0 + i) > 0.9, 0.6, 0.0)
        pd.DataFrame({'time': idx.strftime('%Y-%m-%dT%H:%M'), 'temperature_2m': ta, 'dew_point_2m': ta - 2, 'wind_speed_10m': 2 + np.cos(h / 9.0),
                      'cloud_cover': 100 * cloud, 'shortwave_radiation': np.maximum(0, 80 * np.sin(2 * np.pi * (h % 24) / 24 - 1.6)),
                      'precipitation': pr, 'snowfall': 7.0 * pr * (ta <= 1), 'elev_ifs': 100.0 + i + hojd}).to_csv(f'{mapp}/{s}.csv', index=False)


def metnordic(filer, fran, till, utan_langvag=False):
    idx = pd.date_range(fran, pd.Timestamp(till) + pd.Timedelta(hours=23), freq='h')
    delar = np.array_split(np.arange(len(idx)), len(filer))
    for fil, del_ in zip(filer, delar):
        rader = []
        for i, s in enumerate(SIDS):
            t = idx[del_]; h = del_.astype(float)
            ta = np.array([luften(s, x) for x in t]) + 0.3; cloud = 0.5 + 0.4 * np.sin(h / 17.0 + i)
            rader.append(pd.DataFrame({'station_id': s, 'tid_utc': t.strftime('%Y-%m-%dT%H:%M:%SZ'), 't2m_c': ta.round(2), 'rh2m': 0.85,
                                       'vind10_ms': 2 + np.cos(h / 9.0), 'moln': cloud, 'nederbord_mm': np.where(np.sin(h / 5.0 + i) > 0.9, 0.6, 0.0),
                                       'langvag_jm2': np.nan if utan_langvag else (0.75 + 0.2 * cloud) * 5.67e-8 * (ta + 273.15) ** 4 * 3600,
                                       'kortvag_jm2': np.maximum(0, 80 * np.sin(2 * np.pi * (h % 24) / 24 - 1.6)) * 3600}))
        with gzip.open(fil, 'wt', newline='') as fh:
            pd.concat(rader).to_csv(fh, index=False)


def smhi(mapp, forskjut_h=0):
    os.makedirs(mapp, exist_ok=True)
    json.dump({'station': [{'key': 9001 + i, 'name': f'Prov {i}', 'latitude': float(LAT[i] + 0.01), 'longitude': float(LON[i]), 'from': 0, 'to': 2e12}
                           for i in range(len(SIDS))]}, open(f'{mapp}/smhi_p1.json', 'w', encoding='utf-8'))
    for i, s in enumerate(SIDS):
        rader = ['Stationsnamn;Klimatnummer;Mäthöjd (meter över marken)', f'Prov {i};{9001 + i};2.0', '', 'Datum;Tid (UTC);Lufttemperatur;Kvalitet;;Tidsutsnitt:']
        for t in pd.date_range('2022-10-31 00:00', '2022-11-10 00:00', freq='h'):
            x = luften(s, t - pd.Timedelta(hours=forskjut_h)) + 0.05 * math.sin(7 * t.hour + i)
            rader.append(f"{t.strftime('%Y-%m-%d')};{t.strftime('%H:%M:%S')};{x:.1f};G")
        open(f'{mapp}/smhi_{9001 + i}.csv', 'w', encoding='utf-8').write('\n'.join(rader) + '\n')


# ── 2. Läsaren ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def lasaren(d):
    up = os.path.join(d, 'uploads'); leverans_2024_25(up)
    os.makedirs(os.path.join(d, 'data'))
    json.dump({'stations': [{'id': s, 'lon': float(LON[i]), 'lat': float(LAT[i])} for i, s in enumerate(SIDS)]}, open(os.path.join(d, 'data', 'static.json'), 'w'))
    src = text('fysik/prep.py')
    k("glob.glob('/mnt/user-data/uploads/Halkvakt_*.csv')" in src, 'prep.py läser /mnt/user-data/uploads/')
    cwd = os.getcwd(); os.chdir(d)
    try:
        _tyst(exec, compile(src.replace('/mnt/user-data/uploads/', up.replace('\\', '/') + '/'), 'prep.py', 'exec'), {'__name__': 'prep_fryst'})
    finally:
        os.chdir(cwd)
    fryst = pd.read_parquet(os.path.join(d, 'data', 'vvis_hourly.parquet')).reset_index(drop=True)
    v = lasare.vinter('2024-25')
    h, n, natt = lasare.prep_tabell(lasare.hitta(up, v['filer']), v['fran'], v['till'], SIDS)
    mitt = h.reset_index(drop=True)
    k(fryst.shape == mitt.shape and fryst.equals(mitt), f'timtabellen ≠ den frysta prep.py:s ({fryst.shape} mot {mitt.shape})')
    k(n['dubbletter'] == 0 and n['utanfor_fonstret'] == 0, f'2024/25: inga dubbletter och inget utanför fönstret {n}')
    # Den nya formen
    ny = os.path.join(d, 'ny'); leverans_2022_23(ny)
    v = lasare.vinter('2022-23')
    filer = lasare.hitta(ny, v['filer'])
    k([os.path.basename(f) for f in filer] == ['Halkvakt_2022-2.csv', 'Halkvakt_2023-1.csv.gz'], f'filerna för 2022/23 {filer}')
    h, n, natt = lasare.prep_tabell(filer, v['fran'], v['till'], SIDS)
    k(n['dubbletter'] == 2 and n['dubbletter_olika'] == 1 and n['dubbletter_mellan_filer'] == 2, f'skarvens dubbletter: två, en olika {n}')
    k(n['utanfor_fonstret'] == len(SIDS) + 1, f'utanför fönstret: 31/10 23:30 för varje station och 1/4 00:00 {n}')
    k(lasare.sommartidsprov(natt)['klarat'] and natt['02'] == 0 and natt['01'] == len(SIDS) * 2, f'sommartidsnatten {natt}')
    k(h[(h.sid == '1002') & (h.t == pd.Timestamp('2022-12-31 23:00'))].tyta.iloc[0] == -1.0, 'skarven: den första raden (ÅÅÅÅ-2) behålls')
    k(math.isnan(h[(h.sid == '1003') & (h.t == pd.Timestamp('2022-11-20 09:00'))].tyta.iloc[0]), 'prep: −9 är platshållare')
    r, nr, luft, natt2 = lasare.rader(filer, v['fran'], v['till'], SIDS)
    k(natt2 == natt, f'sommartidsnatten lika i båda läsningarna {natt2} {natt}')
    x = r[(r.sid == '1003') & (r.ts == pd.Timestamp('2022-11-20 09:00:20'))]
    k(len(x) == 1 and x.yta.iloc[0] == -9000, f'raderna: −9 är −9 °C som i databasen, sekunden kvar {x.to_dict()}')
    k(r.yta.dtype == 'Int64' and r.ts.min() == pd.Timestamp('2022-10-31 23:00:03') and r.ts.max() == pd.Timestamp('2023-03-31 21:30:00'),
      f'raderna: lokaltid → UTC, fönstret 1/11 00 – 31/3 23:30 lokal {r.ts.min()} … {r.ts.max()}')
    n2 = lasare.sommartidsprov(dict(natt, **{'02': 3}))['klarat'] or lasare.sommartidsprov(dict(natt, **{'01': 0}))['klarat']
    k(not n2, 'sommartidsprovet fäller rader i timme 02 och en natt utan rader runt omkring')
    k(lasare.milli(pd.Series(['-1,3', '5', '', '+2,25', '-0,05', '-99,9'])).tolist()[:2] == [-1300, 5000]
      and lasare.milli(pd.Series(['+2,25', '-0,05', '-99,9'])).tolist() == [2250, -50, -99900], 'decimalkommat som exakta tusendelar')
    try:
        lasare.milli(pd.Series(['1.5'])); k(False, 'en punkt i stället för komma ska fällas')
    except ValueError:
        pass
    vv = lasare.vinter('2018-19')
    k(vv['filer'] == ['Halkvakt_2018-2.csv', 'Halkvakt_2019-1.csv'] and vv['ifs'] == ('2018-10-10', '2019-03-31')
      and vv['metnordic'] == ('2018-10-31', '2019-03-31') and vv['fran'] == pd.Timestamp('2018-11-01') and vv['till'] == pd.Timestamp('2019-04-01'),
      f'vinterurvalet 2018/19 {vv}')
    try:
        lasare.vinter('2023-24'); k(False, 'halvvintern 2023/24 ska inte gå att välja')
    except ValueError:
        pass


# ── 3. Vakterna ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def vakterna():
    T = pd.Timestamp('2023-01-10 00:00:00')
    rader = []
    def r(sid, t, yta, luft): rader.append((sid, t, yta, luft))
    r('A', T, -12000, 0); r('A', T + pd.Timedelta('1h'), -12001, 0); r('A', T + pd.Timedelta('2h'), -1000, None)
    r('A', T + pd.Timedelta('3h'), 2000, 10000); r('A', T + pd.Timedelta('4h'), 0, 9999); r('A', T + pd.Timedelta('5h'), 4001, 12000)
    r('A', T + pd.Timedelta('5h20min'), 4100, 12000)                                   # samma halvtimme, senare: den behålls
    for dd in (0, 1, 2): r('K', T + pd.Timedelta(days=dd), -13000, 0)                     # tre brott
    r('K', T + pd.Timedelta(days=2, hours=1), -1000, 0)                                   # tre i fönstret ⇒ tyst
    r('K', T + pd.Timedelta(days=6, hours=23, minutes=59, seconds=59), -1000, 0)          # fortfarande tre
    r('K', T + pd.Timedelta(days=7), -1000, 0)                                            # första brottet utanför (t − 7 d, t] ⇒ talar
    D1, D2 = pd.Timestamp('2023-01-20'), pd.Timestamp('2023-01-25')
    for i in range(24): r('L', D1 + pd.Timedelta(hours=i), -6000 if i >= 2 else -5999, 0)   # 22 av 24 med gap ≥ 6 ⇒ dygnet i felet
    for i in range(24): r('M', D2 + pd.Timedelta(hours=i), -6000 if i >= 3 else -5000, 0)   # 21 av 24 ⇒ inte
    for i in range(23): r('N', D2 + pd.Timedelta(hours=i), -6000, 0)                       # 23 rader ⇒ för få
    df = pd.DataFrame(rader, columns=['sid', 'ts', 'yta', 'luft']).astype({'yta': 'Int64', 'luft': 'Int64'})
    pop, n = matt.vakter(df)
    b = lambda t: int(pd.Timestamp(t).value // 10 ** 9 // 1800)
    har = lambda sid, t: ((pop.sid == sid) & (pop.b == b(t))).any()
    k(har('A', T) and not har('A', T + pd.Timedelta('1h')) and not har('A', T + pd.Timedelta('2h')), '#75 vid −12 (med), −12,001 (utan) och utan luft')
    k(not har('A', T + pd.Timedelta('3h')) and har('A', T + pd.Timedelta('4h')), 'radvakten: luft 10 och gap 8 tyst, luft 9,999 talar')
    x = pop[(pop.sid == 'A') & (pop.b == b(T + pd.Timedelta('5h')))]
    k(len(x) == 1 and x.yta.iloc[0] == 4.1, f'radvakten: gap 7,999 talar, och den senaste raden i halvtimmen behålls {x.to_dict()}')
    k(not har('K', T + pd.Timedelta(days=2, hours=1)) and not har('K', T + pd.Timedelta(days=6, hours=23, minutes=59, seconds=59))
      and har('K', T + pd.Timedelta(days=7)), 'karantänen räknar (t − 7 d, t]')
    k(not (pop.sid == 'L').any() and (pop.sid == 'M').sum() == 24 and (pop.sid == 'N').sum() == 23 and n['stationsdygn_i_felet'] == 1,
      f'den långsamma vakten: 22 av 24 fäller dygnet, 21 av 24 och 23 rader gör det inte {n}')


# ── 4. RÅ och måtten mot grind-a.ts ────────────────────────────────────────────────────────────────────────────────────────────────
def grind_a(d):
    rng = np.random.default_rng(5)
    ids = sorted([str(x) for x in (101, 1002, 203, 2004, 305, 4006, 507, 6008, 709, 8010, 911, 12, 1313, 14, 1515, 16, 1717, 18, 1919, 2020)])
    lon = 15 + 2.0 * rng.random(len(ids)); lat = 60 + 0.8 * rng.random(len(ids))
    lon[3] = lon[2]; lat[3] = lat[2]                                                       # två på samma plats: lika avstånd
    lon[5] = lon[4] + 49.6 / 111.2 / math.cos(math.radians(lat[4])); lat[5] = lat[4]       # en granne strax innanför 50 km
    nb = 160
    bas = -1 + 4 * np.sin(np.arange(nb) / 9.0)
    M = bas[:, None] + rng.normal(0, 1.2, (nb, len(ids))) + np.linspace(-1, 3, len(ids))[None, :]
    M[rng.random(M.shape) < 0.25] = np.nan
    M = np.round(M, 1)
    b0 = 1_000_000
    json.dump([{'id': s, 'lon': float(lon[j]), 'lat': float(lat[j]), 'serie': [[b0 + i, float(M[i, j])] for i in range(nb) if np.isfinite(M[i, j])]}
               for j, s in enumerate(ids)], open(f'{d}/st.json', 'w'))
    p = subprocess.run(['node', '--experimental-strip-types', os.path.join(HERE, 'grind_a_facit.ts'), f'{d}/st.json', f'{d}/ut.json'],
                       capture_output=True, text=True, cwd=ROT)
    if p.returncode:
        k(False, f'grind_a_facit.ts föll: {p.stderr[-400:]}'); return
    f = json.load(open(f'{d}/ut.json', encoding='utf-8'))
    RA, ANK = matt.ra_grind_a(M, lon, lat)
    r, c = np.nonzero(np.isfinite(RA))
    py = {(ids[cc], b0 + rr): (RA[rr, cc], ANK[rr, cc], M[rr, cc]) for rr, cc in zip(r, c)}
    ts = {(s, t): (pred, ank, me) for s, t, me, pred, ank in f['punkter']}
    k(set(py) == set(ts) and len(ts) > 500, f'RÅ:s punkter: {len(py)} i Python, {len(ts)} i grind-a.ts')
    k(all(abs(py[x][0] - ts[x][0]) < 1e-12 and abs(py[x][1] - ts[x][1]) < 1e-12 for x in set(py) & set(ts)), 'RÅ och ankKm punkt för punkt')
    meas = np.array([py[x][2] for x in sorted(py)]); pred = np.array([py[x][0] for x in sorted(py)]); ank = np.array([py[x][1] for x in sorted(py)])
    def lika(cell, s, vad):
        par_ = [('n', 'n'), ('nDec', 'nDec'), ('A1', 'mae'), ('A2', 'gross'), ('A3', 'freeze'), ('A1_se', 'maeSe'), ('A2_se', 'grossSe'), ('A3_se', 'freezeSe')]
        for a, b in par_:
            x, y = cell[a], s[b]
            if (x is None) != (y is None) or (x is not None and abs(x - y) > 1e-12):
                k(False, f'{vad}: {a} {x} mot grind-a.ts {b} {y}')
    lika(matt.stats(meas, pred), f['totalt'], 'totalt')
    for namn, lo, hi in matt.BANDS:
        m = (ank >= lo) & (ank < hi)
        lika(matt.stats(meas[m], pred[m]), f['band'][namn], namn)
    k(sum(f['band'][n_]['n'] for n_, _, _ in matt.BANDS) == f['totalt']['n'] and f['band']['>20 km']['n'] > 0, 'banden täcker punkterna')


# ── 5. Halvtimmen ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def halvtimmen():
    rng = np.random.default_rng(2)
    idx = pd.date_range('2024-11-01', periods=50, freq='h').delete([20, 21])               # ett hål i timmarna
    P = rng.normal(0, 2, (len(idx), 3))
    b0 = int(pd.Timestamp('2024-10-31 23:00').value // 10 ** 9 // 1800); nb = 120
    PH = matt.halvtimmar(P, idx, b0, nb)
    # kuvos_replica.py:98–111, ordagrant per station
    hb = (idx.values.astype('datetime64[s]').astype('int64')) // 1800
    facit = np.full((nb, 3), np.nan); hour_rows = hb - b0; good = (hour_rows >= 0) & (hour_rows < nb)
    for kk in range(3):
        ph = P[:, kk]
        facit[hour_rows[good], kk] = ph[good]
        mid = hour_rows[good][:-1] + 1
        v = 0.5 * (ph[good][:-1] + ph[good][1:])
        m2 = (mid < nb) & (np.diff(hour_rows[good]) == 2)
        facit[mid[m2], kk] = v[m2]
    k(np.array_equal(np.isnan(PH), np.isnan(facit)) and np.allclose(PH[np.isfinite(PH)], facit[np.isfinite(facit)], atol=0, rtol=0),
      'halvtimmen som replikans medel av två timmar, med hålet tomt')


# ── 6. Blandningen ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def blandningen():
    km = 1 / 111.2 / math.cos(math.radians(60))
    kedjans = ['S0', 'S1', 'S2', 'S3', 'S4']
    lon = np.array([15, 15 + 5 * km, 15 + 12 * km, 15 + 40 * km, 15 + 600 * km]); lat = np.full(5, 60.0)
    b = 100
    PH2 = np.array([[0.5, -0.2, 1.0, 2.0, 3.0]])
    pop = pd.DataFrame({'sid': ['S0', 'S1', 'S2', 'S3'], 'b': [b] * 4, 'yta': [-1.0, 0.4, 1.5, 1.0]})
    ut, rep, (W, L) = matt.blandning(pop, PH2, kedjans, lon, lat, b, {b: [0, 1, 4]}, logg=None)
    u = timme(pd.DataFrame({'punkt': kedjans, 'lon': lon, 'lat': lat, 'ph': PH2[0]}),
              pd.DataFrame({'punkt': ['S0', 'S1', 'S2', 'S3'], 'yta': [-1.0, 0.4, 1.5, 1.0], 'lon': lon[:4], 'lat': lat[:4]}), W, L).set_index('punkt')
    k(ut[(b, 0)][0] == u.loc['S0', 'pb'] and ut[(b, 1)][0] == u.loc['S1', 'pb'] and ut[(b, 4)][0] == 3.0, f'PB är timme():s {ut}')
    pop2 = pop.assign(yta=[-3.0, 0.4, 1.5, 1.0])
    ut2, _, _ = matt.blandning(pop2, PH2, kedjans, lon, lat, b, {b: [0, 1]}, logg=None)
    k(ut2[(b, 0)][0] == ut[(b, 0)][0] and ut2[(b, 1)][0] != ut[(b, 1)][0], 'stationens egen mätning flyttar inte dess PB, en grannes gör')
    # Replikans urval: 40 stationer på rad 1 km isär, bara de fem bortersta har mätning ⇒ bland de 32 närmaste finns färre än 8
    n = 40; ked = [f'R{i}' for i in range(n)]
    lo = 15 + km * np.arange(n); la = np.full(n, 60.0)
    PH = np.zeros((1, n)); popr = pd.DataFrame({'sid': ked[35:], 'b': [b] * 5, 'yta': [1.0] * 5})
    _, rep, _ = matt.blandning(popr, PH, ked, lo, la, b, {b: [0]}, logg=None)
    k((b, 0) in rep and abs(rep[(b, 0)][0]) < 1e-12 and rep[(b, 0)][1] > 0, f'replikans urval saknar grannfelen bortom de 32 närmaste {rep}')


# ── 7. Sammanslagningen ────────────────────────────────────────────────────────────────────────────────────────────────────────────
def sammanslagningen():
    rng = np.random.default_rng(4)
    me = [np.round(rng.uniform(-8, 5, 400), 1) for _ in range(2)]; pr = [m + rng.normal(0, 1.5, 400) for m in me]
    ank = [rng.uniform(0, 30, 400) for _ in range(2)]; norr = [rng.random(400) < 0.3 for _ in range(2)]
    man = [np.where(rng.random(400) < 0.5, f'{2018 + i}-11', f'{2019 + i}-01') for i in range(2)]
    s = [{'vinter': f'{2018 + i}-{19 + i}', 'i_urvalet': False,
          'matt': {'serier': matt.uppdelning(me[i], {nn: pr[i] for nn in matt.SERIER}, ank[i], norr[i], man[i])}} for i in range(2)]
    s.append({'vinter': '2024-25', 'i_urvalet': True, 'matt': s[0]['matt']})
    m = matt.samman(s)
    hela = matt.stats(np.concatenate(me), np.concatenate(pr))
    t = m['serier']['RÅ']['totalt']
    k(m['vintrar'] == ['2018-19', '2019-20'] and t['n'] == hela['n'] and all(abs(t[x] - hela[x]) < 1e-12 for x in ('A1', 'A2', 'A3', 'A2_se', 'A3_se'))
      and abs(t['A1_se'] - hela['A1_se']) < 1e-9, f'de två vintrarna ihop ur summorna = måtten på alla punkter; i urvalet utanför {t} {hela}')
    k(list(m['serier']['RÅ']['manad']) == ['månad 11', 'månad 01'], f"månaderna ihop, november först {list(m['serier']['RÅ']['manad'])}")


# ── 8. ECMWF ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def ecmwf_hamtning(d):
    pd.DataFrame({'sid': SIDS[:3], 'lon': LON[:3], 'lat': LAT[:3]}).to_csv(f'{d}/st.csv', index=False)
    adresser = []
    def oppna(url, timeout):
        adresser.append(url)
        tider = pd.date_range('2022-10-10', '2023-03-31 23:00', freq='h').strftime('%Y-%m-%dT%H:%M').tolist()
        x = {'elevation': 12.0, 'hourly': {'time': tider, **{f: [1.0] * len(tider) for f in hamta_ifs.V.split(',')}}}
        import io
        return io.StringIO(json.dumps([x] * url.count(',', 0, url.index('&longitude')) + [x]))
    s = _tyst(lambda: hamta_ifs.kor(f'{d}/st.csv', '2022-10-10', '2023-03-31', f'{d}/ifs', oppna=oppna, vanta=lambda s: None))
    h = pd.read_csv(f'{d}/ifs/1001.csv')
    k(len(adresser) == 1 and '&start_date=2022-10-10&end_date=2023-03-31&' in adresser[0] and s['timmar'] == 4152 and s['stationer'] == 3
      and list(h.columns) == ['time'] + hamta_ifs.V.split(',') + ['elev_ifs'], f'ECMWF-filerna i fetch_ifs.py:s form {s} {list(h.columns)}')


# ── 9. Tidszonen ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def tidszonen(d):
    ny = os.path.join(d, 'tz'); leverans_2022_23(ny)
    v = lasare.vinter('2022-23')
    _, _, luft, _ = lasare.rader(lasare.hitta(ny, v['filer']), v['fran'], v['till'], SIDS)
    st = pd.DataFrame({'sid': SIDS, 'lon': LON, 'lat': LAT})
    smhi(f'{d}/s0'); smhi(f'{d}/s1', forskjut_h=1)
    a = tidszon.provet(luft, st, v['fran'], v['till'], f'{d}/s0')
    b = tidszon.provet(luft, st, v['fran'], v['till'], f'{d}/s1')
    k(a['klarat'] and len(a['par']) == 8 and all(p['bast'] == 0 for p in a['par']), f'SMHI: toppen vid 0 h för alla åtta par {a}')
    k(not b['klarat'] and all(p['bast'] == 1 for p in b['par']), f'SMHI: en timmes förskjutning fälls {[p["bast"] for p in b["par"]]}')


# ── 10. Hela körningen och motproven ───────────────────────────────────────────────────────────────────────────────────────────────
def hela(d):
    from sklearn.ensemble import HistGradientBoostingRegressor
    kand = json.load(open(os.path.join(ROT, 'kuvos', 'kandidat-2026-27.json'), encoding='utf-8'))
    rng = np.random.default_rng(11)
    m = HistGradientBoostingRegressor(max_iter=8, max_leaf_nodes=4).fit(rng.normal(0, 1, (400, 70)), rng.normal(0, 0.4, 400))
    pickle.dump(m, open(f'{d}/modell.pkl', 'wb'), protocol=5)
    kand['filer'] = [{'fil': 'modell.pkl', 'bytes': os.path.getsize(f'{d}/modell.pkl'), 'sha256': vinterkedja.sha(f'{d}/modell.pkl')}]
    ind = f'{d}/indata'; os.makedirs(ind); fasta(ind); ecmwf(f'{ind}/ifs', '2024-10-25', '2024-11-08')
    leverans_2024_25(f'{d}/v2425', extra=False)
    metnordic([f'{d}/mn2425.csv.gz'], '2024-10-31', '2024-11-08')
    # Kandidatens tal i urvalet för den påhittade 2024/25, räknade med kedjan själv (frysta.py:s räkning)
    v = lasare.vinter('2024-25')
    h, _, _ = lasare.prep_tabell(lasare.hitta(f'{d}/v2425', v['filer']), v['fran'], v['till'], SIDS)
    D = vinterkedja.datamapp(f'{d}/boot', ind, f'{ind}/ifs', h)
    meta, idx, obs, Ts, P, t0 = vinterkedja.kandidaten(D, f'{d}/mn2425.csv.gz', kand, m)
    import common
    g = common.gates(obs, P)
    kand['i_urvalet'] = {'fysik': kand['i_urvalet']['fysik'], 'fysik_rattelse': {'n': g['n'], 'A1': g['A1'], 'A2': g['A2']}}
    json.dump(kand, open(f'{d}/kandidat.json', 'w', encoding='utf-8'))
    leverans_2022_23(f'{d}/v2223'); ecmwf(f'{d}/ifs2223', '2022-10-10', '2023-03-31', hojd=0.5)
    metnordic([f'{d}/mn_a.csv.gz', f'{d}/mn_b.csv.gz'], '2022-10-31', '2023-03-31'); smhi(f'{d}/smhi')
    def args(**x):
        a = dict(vinter='2022-23', kandidat=f'{d}/kandidat.json', modell=f'{d}/modell.pkl', indata=ind, urvalet_vvis=f'{d}/v2425',
                 urvalet_metnordic=f'{d}/mn2425.csv.gz', vvis=f'{d}/v2223', ifs=f'{d}/ifs2223', metnordic=[f'{d}/mn_a.csv.gz', f'{d}/mn_b.csv.gz'],
                 smhi=f'{d}/smhi', arbete=f'{d}/arbete', ut=f'{d}/ut')
        a.update(x); return types.SimpleNamespace(**a)
    las = lambda ut, v_='2022-23': json.load(open(f'{ut}/kuvos-vintrar-{v_}.json', encoding='utf-8'))
    tyst = lambda f, *a: _tyst(f, *a)
    rk = tyst(vinterkedja.kor, args())
    s = las(f'{d}/ut')
    k(rk == 0 and s['identitetsprov']['klarat'] and s['tidszon']['sommartid']['klarat'] and s['tidszon']['smhi']['klarat']
      and s['indata']['metnordic']['klarat'] and 'matt' in s, f"hela körningen 2022/23: {rk}, {s.get('stopp')}")
    if 'matt' in s:
        se = s['matt']['serier']
        k(all(se[x]['totalt']['n'] == s['matt']['population']['punkter'] > 100 for x in matt.SERIER), f"samma punkter för de tre serierna {s['matt']['population']}")
        k(s['matt']['population']['stationer'] == 8 and s['indata']['ecmwf']['hojden_skiljer_fran_2024_25'] == 0
          and s['indata']['ecmwf']['timmar'] == 4152 and s['indata']['vvis']['raderna']['dubbletter_olika'] == 1,
          f"populationen, ECMWF och skarven {s['matt']['population']} {s['indata']['ecmwf']}")
        k(set(se['RÅ']['manad']) == {'2022-11', '2023-01', '2023-03'} and se['NIVÅ 2']['norr']['n'] == 0, f"månaderna och norr {list(se['RÅ']['manad'])}")
        md = open(f'{d}/ut/kuvos-vintrar-2022-23.md', encoding='utf-8').read()
        k('KLARAT' in md and '| **NIVÅ 2+BLANDNING** |' in md and 'fäller ingenting' in md, 'markdownen')
        def langsta(x):
            return max([len(x)] + [langsta(v) for v in x]) if isinstance(x, list) else max([0] + [langsta(v) for v in x.values()]) if isinstance(x, dict) else 0
        k(langsta(s) <= 20, f'sammanfattningen bär bara aggregat: ingen lista längre än 20 ({langsta(s)})')
    # 2024/25 själv: identitetsprovet och måtten, märkta i urvalet
    rk = tyst(vinterkedja.kor, args(vinter='2024-25', vvis=None, ifs=None, metnordic=[], smhi=None, ut=f'{d}/ut25'))
    s = las(f'{d}/ut25', '2024-25')
    k(rk == 0 and s['i_urvalet'] and 'matt' in s and 'smhi' not in s['tidszon'], f"2024/25 i urvalet: {rk} {s.get('stopp')}")
    # Motproven
    for namn, andra, vantat in (('A2 + 0,03 pe', {'A2': g['A2'] + 0.0003}, 'identitetsprovet'), ('n + 1', {'n': g['n'] + 1}, 'identitetsprovet')):
        kk = json.loads(json.dumps(kand)); kk['i_urvalet']['fysik_rattelse'].update(andra)
        json.dump(kk, open(f'{d}/kand_mot.json', 'w', encoding='utf-8'))
        rk = tyst(vinterkedja.kor, args(kandidat=f'{d}/kand_mot.json', ut=f'{d}/ut_mot'))
        s = las(f'{d}/ut_mot')
        k(rk == 1 and vantat in s.get('stopp', '') and 'matt' not in s and 'tidszon' not in s, f'motprovet {namn}: {rk} {s.get("stopp")}')
    smhi(f'{d}/smhi1', forskjut_h=1)
    rk = tyst(vinterkedja.kor, args(smhi=f'{d}/smhi1', ut=f'{d}/ut_tz')); s = las(f'{d}/ut_tz')
    k(rk == 1 and not s['tidszon']['smhi']['klarat'] and 'matt' not in s, f"motprovet SMHI + 1 h: {rk} {s.get('stopp')}")
    leverans_2022_23(f'{d}/v2223_02', natt_02=True)
    rk = tyst(vinterkedja.kor, args(vvis=f'{d}/v2223_02', ut=f'{d}/ut_st')); s = las(f'{d}/ut_st')
    k(rk == 1 and not s['tidszon']['sommartid']['klarat'] and 'matt' not in s, f"motprovet rader i sommartidsnattens timme 02: {rk}")
    metnordic([f'{d}/mn_utan.csv.gz'], '2022-10-31', '2023-03-31', utan_langvag=True)
    rk = tyst(vinterkedja.kor, args(metnordic=[f'{d}/mn_utan.csv.gz'], ut=f'{d}/ut_lw')); s = las(f'{d}/ut_lw')
    k(rk == 1 and not s['indata']['metnordic']['klarat'] and s['indata']['metnordic']['andel_saknad']['langvag_jm2'] == 1.0 and 'matt' not in s,
      f"motprovet MET Nordic utan långvåg: {rk} {s.get('indata', {}).get('metnordic')}")
    # Spärren i §3 på egen hand
    vinterkedja._IDENTITET.clear()
    for ident in ({'klarat': True, 'n': 5}, None):
        try:
            vinterkedja.las_vinter('2022-23', ident); k(False, f'en äldre vinter lästes utan identitetsprov i körningen ({ident})')
        except RuntimeError:
            pass
    vinterkedja._IDENTITET.update(pid=os.getpid() + 1, klarat=True, n=5)
    try:
        vinterkedja.las_vinter('2022-23', {'klarat': True, 'n': 5}); k(False, 'ett identitetsprov ur en annan process räknades')
    except RuntimeError:
        pass


# ── Tillägget för 2018/19–2021/22 (DECISIONS #711) ───────────────────────────────────────────────────────────────────────────────
def tillagget(d):
    fil = os.path.join(d, 'tillagg.md')

    def spärren(text, finns=True):
        if finns:
            open(fil, 'w', encoding='utf-8').write(text)
        os.environ['V4_TILLAGG_SJALVTEST'] = fil if finns else os.path.join(d, 'saknas.md')
        try:
            return vinterkedja.tillagg_v4()
        except SystemExit as e:
            return str(e)
        finally:
            os.environ.pop('V4_TILLAGG_SJALVTEST', None)
    tab = lambda b, a: f'| | Datum | Signatur |\n| :-- | :-- | :-- |\n| Bengt | {b} |\n| Axel | {a} |\n'
    r = spärren('**Status: UTKAST 25/10 2026.**\n\n' + tab(' | ', ' | '))
    k(isinstance(r, str) and 'inte signerat' in r, f'tillägget: ett utkast utan signaturer släpper inte vintern: {r}')
    r = spärren('**Status: SIGNERAT 26/10 2026**\n\n' + tab('2026-10-26 | Bengt i chatten', ' | '))
    k(isinstance(r, str) and 'inte signerat' in r, f'tillägget: bara Bengts signatur släpper inte vintern: {r}')
    r = spärren('**Status: UTKAST 25/10 2026.**\n\n' + tab('2026-10-26 | Bengt', '2026-10-26 | Axel via Bengt'))
    k(isinstance(r, str) and 'inte signerat' in r, f'tillägget: signaturerna utan statusraden släpper inte vintern: {r}')
    r = spärren('', finns=False)
    k(isinstance(r, str) and 'finns inte' in r, f'tillägget: ett saknat tillägg släpper inte vintern: {r}')
    r = spärren('**Status: SIGNERAT 26/10 2026**\n\n' + tab('2026-10-26 | Bengt i chatten', '2026-10-26 | Axel via Bengt'))
    k(isinstance(r, dict) and all(r[x] for x in ('status_signerad', 'bengt', 'axel')) and len(r['sha256']) == 64 and r['fil'] == 'tillagg.md',
      f'tillägget: statusraden och båda signaturerna släpper vintern, med dokumentets summa: {r}')
    k(vinterkedja.VINTRAR_V4 == ('2018-19', '2019-20', '2020-21', '2021-22')
      and '["2018-19", "2019-20", "2020-21", "2021-22"]' in text('fysik/vintrar/langvag_v4.ts'),
      'tillägget: samma fyra vintrar i kedjan och i långvågens fyllning')
    cache = os.path.join(d, 'smhi_v4'); os.makedirs(cache, exist_ok=True)
    json.dump({'key': 'p1', 'station': [{'key': 7, 'name': 'Gävle'}, {'key': 107420, 'name': 'Gävle A'}, {'key': '7', 'name': 'x'}]},
              open(os.path.join(cache, 'smhi_p1.json'), 'w', encoding='utf-8'))
    l = vinterkedja.smhi_lista_v4(cache)
    k([s['key'] for s in l['station']] == [107420] and l['key'] == 'p1', f'tillägget (Ä4): station 7 ur SMHI:s lista, resten kvar: {l}')
    lw = []
    for i, (v4, ark, sak, tom) in enumerate(((360, 0, [], 0), (310, 48, ['2022-03-20T05:00:00Z'], 754))):
        p = os.path.join(d, f'lw4_{i}.json'); json.dump({'ur_v4': v4, 'ur_arkivet': ark, 'saknas': sak, 'tomma_varden': tom}, open(p, 'w')); lw.append(p)
    delar = [f'rel/metnordic_lw4_2021-10-3{i}_x.csv.gz' for i in range(2)]
    s = vinterkedja.lw4_prov(delar, lw)
    k(s['klarat'] and s['delar'] == 2 and s['listor'] == 2 and s['ur_v4'] == 670 and s['ur_arkivet'] == 48 and s['saknade_timmar'] == 1
      and s['tomma_varden'] == 754, f'tillägget (Ä1): delarna och listorna summeras: {s}')
    s = vinterkedja.lw4_prov(delar[:1] + ['rel/metnordic_reserv_2021-10-31_x.csv.gz'], lw)
    k(not s['klarat'] and s['fel'] == ['metnordic_reserv_2021-10-31_x.csv.gz'], f'tillägget (Ä1): en del utan långvågen fälls: {s}')
    s = vinterkedja.lw4_prov(delar, lw[:1])
    k(not s['klarat'], f'tillägget (Ä1): en del utan lista fälls: {s}')
    # Låsningen (DECISIONS #714): varje del och lista mot sin summa i kuvos/langvag-v4-leverans.json.
    rel = os.path.join(d, 'rel'); os.makedirs(rel, exist_ok=True); riktiga = []
    for i in range(2):
        p = os.path.join(rel, f'metnordic_lw4_2021-10-3{i}_x.csv.gz'); open(p, 'wb').write(b'del %d' % i); riktiga.append(p)
    lev = os.path.join(d, 'leverans.json')
    json.dump({'delar': [{'vinter': '2021-22', 'fil': os.path.basename(p), 'fil_sha256': vinterkedja.sha(p), 'lista': os.path.basename(l),
                          'lista_sha256': vinterkedja.sha(l)} for p, l in zip(riktiga, lw)]
                        + [{'vinter': '2020-21', 'fil': 'metnordic_lw4_2020-10-31_x.csv.gz', 'fil_sha256': '0' * 64, 'lista': 'lw4_9.json',
                            'lista_sha256': '0' * 64}]}, open(lev, 'w'))
    summor = vinterkedja.lw4_leverans('2021-22', lev)
    k(sorted(summor) == sorted(os.path.basename(f) for f in riktiga + lw), f'tillägget (låsningen): bara vinterns delar och listor: {summor}')
    s = vinterkedja.lw4_prov(riktiga, lw, summor)
    k(s['klarat'] and s['summor'] == 4 and s['fel_summa'] == [] and s['saknas_i_kedjan'] == [],
      f'tillägget (låsningen): delar och listor med sina låsta summor går igenom: {s}')
    open(riktiga[1], 'ab').write(b'x')
    s = vinterkedja.lw4_prov(riktiga, lw, summor)
    k(not s['klarat'] and s['fel_summa'] == [os.path.basename(riktiga[1])], f'tillägget (låsningen): en ändrad del fälls: {s}')
    s = vinterkedja.lw4_prov(riktiga[:1], lw[:1], summor)
    k(not s['klarat'] and len(s['saknas_i_kedjan']) == 2, f'tillägget (låsningen): en låst del som saknas i kedjan fälls: {s}')
    try:
        r = vinterkedja.lw4_leverans('2021-22', os.path.join(d, 'ingen.json'))
    except SystemExit as e:
        r = str(e)
    k(isinstance(r, str) and 'inte låsta' in r, f'tillägget (låsningen): utan leveransfilen läses vintern inte: {r}')


def _tyst(f, *a):
    import io, contextlib
    with contextlib.redirect_stdout(io.StringIO()):
        return f(*a)


if __name__ == '__main__':
    with tempfile.TemporaryDirectory() as d:
        kallorna()
        for namn, steg in (('läsaren', lambda: lasaren(os.path.join(d, 'l'))), ('vakterna', vakterna),
                           ('grind A', lambda: grind_a(d)), ('halvtimmen', halvtimmen), ('blandningen', blandningen),
                           ('sammanslagningen', sammanslagningen), ('ECMWF', lambda: ecmwf_hamtning(d)),
                           ('tidszonen', lambda: tidszonen(d)), ('tillägget', lambda: tillagget(d)),
                           ('hela körningen', lambda: hela(os.path.join(d, 'h')))):
            if namn in ('läsaren', 'hela körningen'): os.makedirs(os.path.join(d, 'l' if namn == 'läsaren' else 'h'), exist_ok=True)
            t = time.time(); steg(); print(f'  {namn}: {time.time() - t:.1f} s', flush=True)
    for f_ in fel: print('✗', f_)
    if fel: sys.exit(1)
    print(f'✓ självtest ({time.time() - T0:.0f} s): talen mot källorna, läsaren (prep.py:s timtabell, 12 kolumner, millisekunder, sidfoten, '
          'skarvens dubbletter, fönstret), vakterna vid gränserna, RÅ och måtten mot grind-a.ts, halvtimmen, blandningens leave-one-out '
          'och replikans urval, sammanslagningen, ECMWF-adressen, tidszonen mot SMHI, tillägget för 2018/19–2021/22 (spärren, station 7 '
          'och långvågens delar med de låsta summorna), och hela körningen med fem motprov')
