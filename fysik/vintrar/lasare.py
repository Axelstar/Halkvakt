"""Läsaren för Trafikverkets VViS-filer, en vinter i taget (DECISIONS #666–#668, docs/FORREGISTRERING-FLER-VINTRAR.md §1–§3).

Vintrarna 2018/19–2022/23 ligger i leveransen 21/10 (kuvos/vvis-2018-24-leverans.json) som Halkvakt_ÅÅÅÅ-1 (januari–juni) och
Halkvakt_ÅÅÅÅ-2 (hösten): vintern ÅÅÅÅ/ÅÅÅÅ+1 läses ur ÅÅÅÅ-2 och (ÅÅÅÅ+1)-1. 2024/25 (identitetsprovet) ligger i leveransen 2/10
(kuvos/leverans.json) som fem månadsfiler. Formen är densamma (KUVOS-LEVERANSEN §1, §9): semikolon, decimalkomma, BOM, platshållarna
−99,9 och −9, SSMS-sidfoten (fem rader per fil); de nya filerna har 12 kolumner (ingen siktdjup) och stämplar med millisekunder.
Kolumnerna läses vid namn, så båda formerna går igenom samma väg.

Läsfönstret är 1/11–31/3 i svensk lokaltid, som leveransen 2024/25 (1/11 00:00:03 – 31/3 23:30:06): raderna med stämpel i
[1/11 00:00, 1/4 00:00). Uppvärmningen 10/10–31/10 är vädrets (ECMWF), inte mätningarnas.

Dubbletterna i filskarven (samma station och samma stämpel i båda filerna, KUVOS-LEVERANSEN §9): den första i filordningen behålls
(ÅÅÅÅ-2 före (ÅÅÅÅ+1)-1, som prep.py:s concat + drop_duplicates). Antalet räknas, och hur många som skiljer sig i något värde.

Två produkter, eftersom kedjan och grind A läser leveransen på var sitt sätt — och båda ska vara de frysta:
  timtabellen   som fysik/prep.py (prep.py:3–23 rad för rad, se prep_tabell): platshållarna ur prep.py:2 som NaN, stämpeln
                avrundad till halvtimme, Europe/Stockholm → UTC med NaT för tvetydiga och obefintliga tider, vakten 'bad', första raden
                per (station, halvtimme), bara stationerna i indatans stations.csv; timmarna (:00) till vvis_hourly.parquet, som
                common.load() läser. Det är kedjans population (identitetsprovets n).
  raderna       som kuvösens databas (kuvos/inlasning.ts → kuvos/oversattning.sql): stämpeln till sekund (bråkdelen stryks, som
                inläsningens TID), lokaltid → UTC som PostgreSQL:s AT TIME ZONE (tvetydigt och obefintligt med normaltidens offset),
                bara −99,9 som NULL i yta och luft (nullif), och värdena som exakta heltal i tusendels grader — databasens kolumner
                är numeric, så vakternas jämförelser (luft − 12, 8, 6) är exakta där. Grind A:s population räknas ur dem (matt.py).

  python fysik/vintrar/lasare.py --vinter 2022-23 --vvis <mapp> --stationer <stations.csv>     bara antalen (inga mätvärden)
"""
import argparse, json, os, re, sys
import numpy as np
import pandas as pd

TZ = 'Europe/Stockholm'
NA_PREP = ['-9', '-99,9', '-99,8', '-100', '-99.9']                      # fysik/prep.py:2, ordagrant
PREP_KOL = ['sid', 't', 'tyta', 'tluft', 'daggp', 'lu_fu', 'ned_typ', 'ned_maengd', 'vimed']    # prep.py:14
LAS_KOL = ['measurepoint', 'measuretime', 'tyta', 'tluft', 'daggp', 'lu_fu', 'ned_typ', 'ned_maengd', 'vimed']
SENTINEL_MILLI = -99900                                                   # oversattning.sql: nullif(tyta, -99.9), nullif(tluft, -99.9)
TALET = re.compile(r'^([+-]?)(\d+)(?:,(\d{1,3}))?$')                      # inlasning.ts TALET, med högst tre decimaler (tusendelar)
URVALET = '2024-25'
VINTRAR = ('2018-19', '2019-20', '2020-21', '2021-22', '2022-23')
FILER_URVALET = ['Halkvakt_2411.csv', 'Halkvakt_2412.csv', 'Halkvakt_2501.csv', 'Halkvakt_2502.csv', 'Halkvakt_2503.csv']   # kuvos/leverans.json


def sista_sondag_i_mars(ar):
    d = pd.Timestamp(year=ar, month=3, day=31)
    return d - pd.Timedelta(days=(d.weekday() + 1) % 7)


def vinter(namn):
    """'2018-19' → filerna, läsfönstret (lokal tid), ECMWF:s datum, MET Nordics dygn och sommartidsnatten."""
    if namn not in VINTRAR + (URVALET,):
        raise ValueError(f'vintern {namn!r}: väntat en av {VINTRAR + (URVALET,)}')
    a = int(namn[:4]); b = a + 1
    return dict(namn=namn, i_urvalet=namn == URVALET,
                filer=FILER_URVALET if namn == URVALET else [f'Halkvakt_{a}-2.csv', f'Halkvakt_{b}-1.csv'],
                fran=pd.Timestamp(f'{a}-11-01'), till=pd.Timestamp(f'{b}-04-01'),
                ifs=(f'{a}-10-10', f'{b}-03-31'), metnordic=(f'{a}-10-31', f'{b}-03-31'),
                sommartid=sista_sondag_i_mars(b))


def hitta(mapp, filer):
    """Leveransens filer i mappen, packade eller inte, i filordningen."""
    ut = []
    for f in filer:
        for kand in (f + '.gz', f):
            if os.path.exists(os.path.join(mapp, kand)):
                ut.append(os.path.join(mapp, kand)); break
        else:
            raise FileNotFoundError(f'{f}(.gz) saknas i {mapp}')
    return ut


def _las(filer, fran, till, **kw):
    """Filerna i ordning → en tabell med sid, lokal stämpel och fil; sidfoten bort (prep.py:8), dubbletterna i skarven räknade och
    den första behållen, sedan läsfönstret. Returnerar tabellen och antalen."""
    delar = []
    for i, f in enumerate(filer):
        d = pd.read_csv(f, sep=';', encoding='utf-8-sig', usecols=lambda c: c in kw['kol'], low_memory=False,
                        **{k: v for k, v in kw.items() if k != 'kol'})
        saknas = [c for c in kw['kol'] if c not in d.columns]
        if saknas:
            raise ValueError(f'{os.path.basename(f)}: kolumnerna {saknas} saknas — formen är inte den besiktigade')
        d = d[d.measurepoint.astype(str).str.strip().str.isdigit()].copy()
        d['fil'] = i
        delar.append(d)
    df = pd.concat(delar, ignore_index=True)
    df['sid'] = df.measurepoint.str.strip()
    df['lokal'] = pd.to_datetime(df.measuretime, format='ISO8601')          # med eller utan millisekunder
    n = dict(rader=int(len(df)))
    dubbel = df.duplicated(['sid', 'lokal'], keep=False)
    n['dubbletter'] = int(df.duplicated(['sid', 'lokal'], keep='first').sum())
    if n['dubbletter']:
        varden = [c for c in kw['kol'] if c not in ('measurepoint', 'measuretime')]
        g = df[dubbel].astype({c: str for c in varden}).groupby(['sid', 'lokal'])[varden].nunique(dropna=False)
        n['dubbletter_olika'] = int((g > 1).any(axis=1).sum())
        n['dubbletter_mellan_filer'] = int(df[dubbel].groupby(['sid', 'lokal']).fil.nunique().gt(1).sum())
    else:
        n['dubbletter_olika'] = n['dubbletter_mellan_filer'] = 0
    df = df[~df.duplicated(['sid', 'lokal'], keep='first')]
    i_fonstret = (df.lokal >= fran) & (df.lokal < till)
    n['utanfor_fonstret'] = int((~i_fonstret).sum())
    df = df[i_fonstret]
    n['i_fonstret'] = int(len(df)); n['stationer'] = int(df.sid.nunique())
    return df, n


def prep_tabell(filer, fran, till, sids):
    """Timtabellen som prep.py: samma inläsning (sep, decimal, BOM, platshållare, dtype), samma steg i samma ordning. Returnerar
    (timmarna, antalen, sommartidsnattens rader per lokal timme 00–09 räknade på alla stationer)."""
    df, n = _las(filer, fran, till, kol=LAS_KOL, decimal=',', na_values=NA_PREP, dtype={'measurepoint': str})
    timmar = sommartidsnatten(df, till)
    # prep.py:10–23, ordagrant utom stationslistan (indatans stations.csv i stället för static.json, förregistreringen §2) och
    # stämpeln, som redan är tolkad (df.lokal är pd.to_datetime(df.measuretime))
    t = df.lokal.dt.round('30min')
    df = df.assign(t=t.dt.tz_localize(TZ, ambiguous='NaT', nonexistent='NaT').dt.tz_convert('UTC').dt.tz_localize(None))
    df = df.dropna(subset=['t'])
    df = df[PREP_KOL]
    bad = ((df.tluft - df.tyta) > 12) | ((df.tluft >= 10) & ((df.tluft - df.tyta) >= 8)) | (~df.tyta.between(-45, 45))
    df['bad'] = bad
    df = df.sort_values(['sid', 't'])
    df.loc[df.bad, 'tyta'] = np.nan
    df = df.drop_duplicates(['sid', 't'])
    df = df[df.sid.isin(set(sids))]
    h = df[df.t.dt.minute == 0].copy()
    n.update(timrader=int(len(h)), timstationer=int(h.sid.nunique()))
    return h, n, timmar


def sommartidsnatten(df, till):
    """Raderna per lokal timme 00–09 natten till sommartid i vinterns slut, räknade på alla stationer i filerna."""
    natt = df.lokal.dt.normalize() == sista_sondag_i_mars(till.year)
    return {f'{h:02d}': int(((df.lokal.dt.hour == h) & natt).sum()) for h in range(10)}


def milli(s):
    """Text med decimalkomma → exakt heltal i tusendelar; tom text → <NA>. Annat än ett tal fälls (inlasning.ts TALET)."""
    s = s.fillna('')
    m = s.str.extract(TALET)
    fel = (s != '') & m[1].isna()
    if fel.any():
        raise ValueError(f'värden som inte är tal: {sorted(s[fel].unique())[:5]}')
    hel = pd.to_numeric(m[1], errors='coerce').astype('Int64') * 1000
    dec = m[2].fillna('').str.ljust(3, '0')
    v = hel + pd.to_numeric(dec, errors='coerce').astype('Int64')
    return v.where(m[0] != '-', -v)


def rader(filer, fran, till, sids):
    """Raderna som kuvösens databas bär dem: sid, ts (UTC, sekund), yta och luft i tusendels grader (Int64, <NA> = NULL), bara
    rader med yta och bara indatans stationer. Returnerar (raderna, antalen, luften per hel lokal timme och sommartidsnatten för
    tidszonsprovet)."""
    df, n = _las(filer, fran, till, kol=['measurepoint', 'measuretime', 'tyta', 'tluft'], dtype=str, keep_default_na=False,
                 na_filter=False)
    natt = sommartidsnatten(df, till)
    yta, luft = milli(df.tyta), milli(df.tluft)
    yta = yta.mask(yta == SENTINEL_MILLI); luft = luft.mask(luft == SENTINEL_MILLI)
    sek = df.lokal.dt.floor('s')
    # PostgreSQL (timestamp AT TIME ZONE): en tvetydig tid tolkas efter övergången, en obefintlig före den — för Europe/Stockholm
    # båda med normaltidens +01. pandas: ambiguous=False är normaltid; en obefintlig tid flyttad en timme framåt i väggtid är +01.
    ts = sek.dt.tz_localize(TZ, ambiguous=False, nonexistent=pd.Timedelta('1h')).dt.tz_convert('UTC').dt.tz_localize(None)
    ut = pd.DataFrame({'sid': df.sid, 'ts': ts, 'yta': yta, 'luft': luft})
    # Tidszonsprovet läser luften vid hel timme (minut 00, som kuvos-tidszon-2026-10-02.py), med −99,9 som saknad.
    hel = df.lokal.dt.minute == 0
    tidszon = pd.DataFrame({'sid': df.sid, 'lokal': df.lokal.dt.floor('h'), 'luft': (luft / 1000.0).astype(float)})[hel]
    ut = ut[ut.yta.notna() & ut.sid.isin(set(sids))]
    # Databasens primärnyckel (station, sekund): två rader i samma sekund blir en, den senast lästa (ON CONFLICT DO UPDATE).
    ut = ut.drop_duplicates(['sid', 'ts'], keep='last').reset_index(drop=True)
    n.update(med_yta=int(len(ut)), stationer_med_yta=int(ut.sid.nunique()))
    return ut, n, tidszon, natt


def sommartidsprov(timmar):
    """Natten till sommartid ska sakna rader i lokal timme 02 och ha rader i 00–01 och 03–09 (KUVOS-LEVERANSEN §3: 1 522 rader i
    varje timme utom 02, som hade 0). Utan rader runt omkring säger provet ingenting, och då är det inte klarat."""
    klarat = timmar['02'] == 0 and all(v > 0 for k, v in timmar.items() if k != '02')
    return dict(rader_per_lokal_timme=timmar, klarat=bool(klarat))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--vinter', required=True); ap.add_argument('--vvis', required=True); ap.add_argument('--stationer', required=True)
    a = ap.parse_args()
    v = vinter(a.vinter)
    sids = pd.read_csv(a.stationer, dtype={'sid': str}).sid.tolist()
    filer = hitta(a.vvis, v['filer'])
    h, n, timmar = prep_tabell(filer, v['fran'], v['till'], sids)
    print(json.dumps({'vinter': v['namn'], 'timtabellen': n, 'sommartiden': {'datum': str(v['sommartid'].date()), **sommartidsprov(timmar)}},
                     ensure_ascii=False, indent=1))
