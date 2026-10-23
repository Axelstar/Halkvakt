"""Den frysta kandidaten NIVÅ 2+BLANDNING (#552) prövad på en vinter, utan omträning (förregistreringen FLER-VINTRAR, DECISIONS
#666–#668). Diagnos: ingen dom, ingen tröskel och ingen kandidat ändras (§1, §5).

Ordningen är förregistreringens:
  (a) identitetsprovet: samma kedja på 2024/25 med kuvösens indata ska ge kandidatfilens tal i urvalet — fysiken med rättelsen
      n exakt, A1 ± 0,01 °C, A2 ± 0,02 procentenheter (§3, som #597). Faller det stannar körningen. En äldre vinter läses bara i
      samma körning (samma process) som ett klarat identitetsprov — las_vinter() vägrar annars;
  (b) tidszonen för vintern: sommartidsnatten utan rader (lasare.sommartidsprov) och SMHI:s förskjutning 0 h (tidszon.provet).
      Faller ett av dem läses inte vintern;
  sedan kandidatens värde i analysläget (§2) och måtten (§4, matt.py).
Kandidatens värde är den frysta kedjans egen kod, importerad och oförändrad: common.load (via common.D, som paritet.py gör) →
metnordic.load_mn (MET Nordics analys, ECMWF för timindexet, höjden och uppvärmningen från 10/10, snötäcket från 10/10) →
fysik_lw.run_lw med kandidatfilens femton parametrar → kedja.base_features_mn/state_features_mn → modell.pkl på de 70 särdragen
(frysta.py:s rad P = Ts + m.predict(gather(…))). Det som var låst vid 2024/25 (fetch_ifs.py:12, kedja.py:33, common.py:3, filnamnen)
är parametrar här: vinterns datamapp sätts som common.D, ECMWF hämtas med hamta_ifs.py och MET Nordic med metnordic_vinter.ts.
MET Nordics analysfil prövas innan den läses: timmarna 31/10 00 – 31/3 23 UTC och högst MAX_IFYLLT (den levande kedjans gräns,
fysik/live/kandidat_fysik.py) saknade värden per fält — load_mn fyller annars tyst med ECMWF eller Brutsaert.

Utdata (--ut): kuvos-vintrar-<vinter>.json och .md, bara aggregat. Trafikverkets rader stannar i --arbete, som ingen artefakt tar.

  python fysik/vintrar/vinterkedja.py --vinter 2022-23 --kandidat kuvos/kandidat-2026-27.json --modell modell.pkl
      --indata <stations.csv, elev.csv, geofeat.csv, geofeat2.csv, road_all.csv, ifs/ ur kuvos-fysik-indata-2024-25>
      --urvalet-vvis <Halkvakt_2411…2503.csv(.gz)> --urvalet-metnordic <metnordic_2024-25.csv.gz>
      --vvis <Halkvakt_ÅÅÅÅ-N.csv.gz> --ifs <vinterns ifs/> --metnordic <vinterns delar …> --smhi <cache> --arbete <mapp> --ut <mapp>
  python fysik/vintrar/vinterkedja.py --vinter 2024-25 …       bara (a) och 2024/25:s mått, märkta i urvalet
  python fysik/vintrar/vinterkedja.py --samman <json …> --ut <mapp>       de fem vintrarna ihop ur summorna
"""
import argparse, gc, hashlib, json, math, os, pickle, platform, shutil, sys, time
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
FYS = os.path.dirname(HERE)
sys.path[:0] = [HERE, os.path.join(FYS, 'niva2'), FYS, os.path.join(FYS, 'live')]
import common
from metnordic import load_mn, las_metnordic, FALT
from fysik_lw import run_lw
from kedja import base_features_mn, state_features_mn, gather
from kandidat_fysik import MAX_IFYLLT
import lasare, matt, tidszon

FASTA = ('stations.csv', 'elev.csv', 'geofeat.csv', 'geofeat2.csv', 'road_all.csv')   # stationernas fasta data (§2)
TOL_A1, TOL_A2 = 0.01, 0.0002                                                       # §3 a: ± 0,01 °C och ± 0,02 procentenheter
T0 = time.time()
_IDENTITET = {}                                                                     # identitetsprovet i den här processen


def logg(s):
    print(f'[{round(time.time() - T0)} s] {s}', flush=True)


def sha(fil):
    return hashlib.sha256(open(fil, 'rb').read()).hexdigest()


def ladda(kandidatfil, modellfil):
    """Kandidatfilen och rättelsen; modellens sha256 mot filen (som paritet.py) och scikit-learn som modellen sparades med."""
    kand = json.load(open(kandidatfil, encoding='utf-8'))
    if kand.get('fysik') != 'lw' or kand.get('beslut') != '#552':
        raise ValueError(f"kandidatfilen: fysik {kand.get('fysik')}, beslut {kand.get('beslut')} — väntat lw och #552")
    vantad = next(f['sha256'] for f in kand['filer'] if f['fil'] == 'modell.pkl')
    s = sha(modellfil)
    if s != vantad:
        raise RuntimeError(f'modell.pkl: sha256 {s[:12]}… är inte kandidatens {vantad[:12]}…')
    import sklearn
    if sklearn.__version__ != kand['versioner']['scikit-learn']:
        raise RuntimeError(f"scikit-learn {sklearn.__version__}, modellen är sparad med {kand['versioner']['scikit-learn']} (fysik/requirements.txt)")
    with open(modellfil, 'rb') as fh:
        return kand, pickle.load(fh), s


def datamapp(D, indata, ifs, timmar):
    """Vinterns mapp som common.load läser: de fasta filerna ur indatan, vinterns ECMWF och läsarens timtabell."""
    os.makedirs(D, exist_ok=True)
    for f in FASTA:
        shutil.copyfile(os.path.join(indata, f), os.path.join(D, f))
    if os.path.abspath(ifs) != os.path.abspath(os.path.join(D, 'ifs')):
        shutil.rmtree(os.path.join(D, 'ifs'), ignore_errors=True)
        shutil.copytree(ifs, os.path.join(D, 'ifs'))
    timmar.to_parquet(os.path.join(D, 'vvis_hourly.parquet'))
    return D


def kandidaten(D, mn_fil, kand, modell):
    """Kandidatens timvärden PH i analysläget, med den frysta kedjans funktioner (frysta.py:s räkning utan kalibreringen)."""
    common.D = D
    meta, idx, F, obs, aux, t0 = load_mn(mn_fil)
    p = {k: float(v) for k, v in kand['parametrar'].items()}
    Ts, T5 = run_lw(F, p)
    feat = state_features_mn(base_features_mn(meta, idx, F, Ts, T5), F, Ts)
    names = list(feat)
    if names != kand['sardrag']:
        raise RuntimeError(f'särdragen: {len(names)} i kedjan, {len(kand["sardrag"])} i kandidatfilen, eller i annan ordning')
    del F, aux
    P = Ts + modell.predict(gather(feat, names, np.arange(len(meta)))).reshape(Ts.shape)
    del feat; gc.collect()
    return meta, idx, obs, Ts, P, t0


def mn_prov(fil, sids, fran, till):
    """MET Nordics analysfil: timmarna [fran 00, till 23] UTC och andelen saknade värden per fält på kedjans stationer."""
    d = las_metnordic(fil, set(sids)).drop_duplicates(['station_id', 'tid_utc'])
    timmar = pd.date_range(fran, pd.Timestamp(till) + pd.Timedelta(hours=23), freq='h')
    d = d[d.tid_utc.isin(timmar)]
    celler = len(sids) * len(timmar)
    saknas = {f: round(1 - int(d[f].notna().sum()) / celler, 6) for f in FALT}
    return dict(forsta=str(d.tid_utc.min()), sista=str(d.tid_utc.max()), timmar=len(timmar), stationer=int(d.station_id.nunique()),
                andel_saknad=saknas, klarat=bool(str(d.tid_utc.min()) == str(timmar[0]) and str(d.tid_utc.max()) == str(timmar[-1])
                                                  and all(v <= MAX_IFYLLT for v in saknas.values())))


def identitetsprov(kand, modell, indata, vvis, mn_fil, arbete):
    """(a): den nya kedjan på 2024/25 med kuvösens indata mot kandidatfilens i_urvalet (fysik_rattelse)."""
    v = lasare.vinter(lasare.URVALET)
    sids = pd.read_csv(os.path.join(indata, 'stations.csv'), dtype={'sid': str}).sid.tolist()
    timmar, n_prep, natt = lasare.prep_tabell(lasare.hitta(vvis, v['filer']), v['fran'], v['till'], sids)
    logg(f"identitetsprovet: timtabellen 2024/25 {n_prep}")
    D = datamapp(os.path.join(arbete, v['namn']), indata, os.path.join(indata, 'ifs'), timmar)
    meta, idx, obs, Ts, P, t0 = kandidaten(D, mn_fil, kand, modell)
    g, g_ts = common.gates(obs, P), common.gates(obs, Ts)
    mal = kand['i_urvalet']['fysik_rattelse']
    klarat = g['n'] == mal['n'] and abs(g['A1'] - mal['A1']) <= TOL_A1 and abs(g['A2'] - mal['A2']) <= TOL_A2
    ut = dict(n=g['n'], A1=round(g['A1'], 5), A2=round(g['A2'], 6), krav=dict(n=mal['n'], A1=mal['A1'], A2=mal['A2'], tol_A1=TOL_A1, tol_A2=TOL_A2),
              fysik_ensam=dict(n=g_ts['n'], A1=round(g_ts['A1'], 5), A2=round(g_ts['A2'], 6),
                               kandidatfilen=kand['i_urvalet']['fysik']),
              stationer=int(len(meta)), timmar=int(len(idx)), metnordic_fran=str(t0), timtabellen=n_prep,
              metnordic=mn_prov(mn_fil, list(meta.sid), *v['metnordic']), klarat=bool(klarat))
    logg(f"identitetsprovet: n {g['n']} (krav {mal['n']}), A1 {g['A1']:.5f} °C (krav {mal['A1']:.5f} ± {TOL_A1}), "
         f"A2 {100 * g['A2']:.4f} % (krav {100 * mal['A2']:.4f} ± {100 * TOL_A2:.2f} pe) → {'KLARAT' if klarat else 'FALLER'}")
    if klarat:
        _IDENTITET.update(pid=os.getpid(), klarat=True, n=g['n'])
    return ut, (meta, idx, P), natt


def las_vinter(namn, identitet):
    """Spärren i §3: en äldre vinter läses bara efter ett klarat identitetsprov i samma körning."""
    if namn == lasare.URVALET:
        return
    if not (identitet and identitet.get('klarat') is True and _IDENTITET.get('klarat') is True and _IDENTITET.get('pid') == os.getpid()
            and _IDENTITET.get('n') == identitet.get('n')):
        raise RuntimeError('identitetsprovet (a) är inte klarat i den här körningen — ingen äldre vinter läses (förregistreringen §3)')


def mattet(pop, indata, meta, idx, P):
    pos = pd.read_csv(os.path.join(indata, 'stations.csv'), dtype={'sid': str})
    return matt.matt(pop, pos, P, idx, list(meta.sid), logg)


def markdown(s):
    v = s['vinter'].replace('-', '/')
    ut = [f"## Den frysta kandidaten på vintern {v}{' — i urvalet' if s['i_urvalet'] else ''} (förregistreringen FLER-VINTRAR)", '',
          f"Diagnos, ingen dom (§1, §5). Kandidaten {s['kandidat']['beslut']}: fysiken {s['kandidat']['fysik']}, modell.pkl "
          f"{s['kandidat']['modell_sha256'][:8]}…, paret W {str(s['kandidat']['par']['W']).replace('.', ',')} · L {s['kandidat']['par']['L_km']:g} km, "
          "analysläget.", '']
    i = s.get('identitetsprov')
    if i:
        ut += ['### Proven före läsningen', '',
               f"- **(a) Identitetsprovet** på 2024/25: n {matt.tal(i['n'])} (krav {matt.tal(i['krav']['n'])}), A1 {matt.grad(i['A1'], 5)} "
               f"(krav {matt.grad(i['krav']['A1'], 5)} ± 0,01 °C), A2 {matt.pct(i['A2'], 4)} (krav {matt.pct(i['krav']['A2'], 4)} ± 0,02 pe) → "
               f"**{'KLARAT' if i['klarat'] else 'FALLER'}**. Fysiken ensam: A1 {matt.grad(i['fysik_ensam']['A1'])}, A2 {matt.pct(i['fysik_ensam']['A2'])} "
               f"(kandidatfilen {matt.grad(i['fysik_ensam']['kandidatfilen']['A1'])}, {matt.pct(i['fysik_ensam']['kandidatfilen']['A2'])})."]
    t = s.get('tidszon')
    if t:
        so = t['sommartid']
        timrad = ' · '.join('{} {}'.format(k, matt.tal(x)) for k, x in so['rader_per_lokal_timme'].items())
        ut.append(f"- **(b) Sommartidsnatten** {so['datum']}: rader per lokal timme 00–09 {timrad} → **{'KLARAT' if so['klarat'] else 'FALLER'}**.")
        if 'smhi' in t:
            sm = t['smhi']
            toppar = ', '.join('{}/{} {:+d} h'.format(p['vvis'], p['namn'], p['bast']) for p in sm['par'])
            ut.append(f"- **(b) SMHI**: {len(sm['par'])} par räknade av {sm['kandidatpar']} kandidater, toppen vid {toppar} → "
                      f"**{'KLARAT' if sm['klarat'] else 'FALLER'}** ({sm['regel']}).")
    if s.get('stopp'):
        ut += ['', f"**Läsningen stannade:** {s['stopp']}"]
    ind = s.get('indata')
    if ind:
        ut += ['', '### Indata', '', f"- VViS: {json.dumps(ind['vvis'], ensure_ascii=False)}"]
        if 'metnordic' in ind:
            ut.append(f"- MET Nordic: {json.dumps(ind['metnordic'], ensure_ascii=False)}")
        if 'ecmwf' in ind:
            ut.append(f"- ECMWF: {json.dumps(ind['ecmwf'], ensure_ascii=False)}")
    if 'vakterna' in s:
        ut += ['', f"- Vakterna (rader): {json.dumps(s['vakterna'], ensure_ascii=False)}"]
    m = s.get('matt')
    if m:
        ut += ['', f"### Måtten — grind A:s population: {matt.tal(m['population']['punkter'])} punkter vid {m['population']['stationer']} stationer "
                   f"(norr {matt.tal(m['population']['norr'])}, söder {matt.tal(m['population']['soder'])})", '']
        ut += matt.markdown_serier(m['serier'], 'RÅ, NIVÅ 2 och NIVÅ 2+BLANDNING (felmarginal 1,96 · standardfel)')
        r = m['replikans_urval']
        ut += ['', f"Kuvösens replika (de 32 närmaste, sedan de 8 första ändliga) skiljer sig från den levande kedjan i "
                   f"{matt.tal(r['punkter_dar_urvalet_skiljer'])} punkter (största skillnad i grannfelet {matt.grad(r['storsta_skillnad_corr_c'])}); "
                   f"NIVÅ 2+BLANDNING med replikans urval: {matt.kort(r['NIVÅ 2+BLANDNING (replikans urval)'])}.", '',
               "Grind A:s tak för A2, 5 %, står bredvid och fäller ingenting. Väg B:s 4,84 % (analys) och 5,12 % (+6 h) är andra stationer "
               "samma år (#544) och står bredvid, inte som prov (§5)."]
    return '\n'.join(ut) + '\n'


def skriv(s, ut):
    os.makedirs(ut, exist_ok=True)
    bas = os.path.join(ut, f"kuvos-vintrar-{s['vinter']}")
    with open(bas + '.json', 'w', encoding='utf-8') as fh: json.dump(s, fh, ensure_ascii=False, indent=1)
    with open(bas + '.md', 'w', encoding='utf-8') as fh: fh.write(markdown(s))
    logg(f'sammanfattningen: {bas}.json och .md')


def kor(a):
    namn = a.vinter; v = lasare.vinter(namn)
    kand, modell, msha = ladda(a.kandidat, a.modell)
    s = dict(_om='Förregistreringen FLER-VINTRAR (DECISIONS #666–#668): den frysta kandidaten i analysläget på en vinter. Bara aggregat.',
             vinter=namn, i_urvalet=v['i_urvalet'],
             kandidat=dict(beslut=kand['beslut'], fysik=kand['fysik'], par=kand['par'], modell_sha256=msha),
             versioner=dict(python=platform.python_version(), numpy=np.__version__, pandas=pd.__version__))
    ident, (meta, idx, P), natt = identitetsprov(kand, modell, a.indata, a.urvalet_vvis, a.urvalet_metnordic, a.arbete)
    s['identitetsprov'] = ident
    if not ident['klarat']:
        s['stopp'] = 'identitetsprovet (a) föll — ingenting annat körs, och felet söks (§3).'
        skriv(s, a.ut); return 1
    sids = pd.read_csv(os.path.join(a.indata, 'stations.csv'), dtype={'sid': str}).sid.tolist()
    filer = lasare.hitta(a.urvalet_vvis if v['i_urvalet'] else a.vvis, v['filer'])
    las_vinter(namn, ident)
    if not v['i_urvalet']:
        hoj_2425 = meta.set_index('sid').elev_ifs
        del meta, idx, P; gc.collect()
    # Tidszonen först (b): sommartidsnatten och SMHI ur raderna, innan kedjans timtabell byggs.
    rader, n_rad, luft, natt_v = lasare.rader(filer, v['fran'], v['till'], sids)
    s['tidszon'] = {'sommartid': {'datum': str(v['sommartid'].date()), **lasare.sommartidsprov(natt if v['i_urvalet'] else natt_v)}}
    s['indata'] = {'vvis': {'filer': [os.path.basename(f) for f in filer], 'raderna': n_rad}}
    if v['i_urvalet']:
        s['indata']['vvis']['timtabellen'] = ident['timtabellen']
    else:
        s['tidszon']['smhi'] = tidszon.provet(luft, pd.read_csv(os.path.join(a.indata, 'stations.csv'), dtype={'sid': str}),
                                              v['fran'], v['till'], a.smhi)     # perioden i UTC, som 2/10: 1/11 00 – 1/4 00
        if not (s['tidszon']['sommartid']['klarat'] and s['tidszon']['smhi']['klarat']):
            s['stopp'] = 'tidszonsprovet (b) visar något annat än svensk lokaltid — vintern läses inte, och frågan går till Bengt (§3).'
            skriv(s, a.ut); return 1
        timmar, s['indata']['vvis']['timtabellen'], _ = lasare.prep_tabell(filer, v['fran'], v['till'], sids)
        mn_fil = os.path.join(a.arbete, f'metnordic_{namn}.csv.gz')
        d = pd.concat([pd.read_csv(f, dtype={'station_id': str}) for f in sorted(a.metnordic)], ignore_index=True)
        d.drop_duplicates(['station_id', 'tid_utc']).sort_values(['station_id', 'tid_utc']).to_csv(mn_fil, index=False)
        del d
        s['indata']['metnordic'] = dict(delar=len(a.metnordic), **mn_prov(mn_fil, sids, *v['metnordic']))
        if not s['indata']['metnordic']['klarat']:
            s['stopp'] = (f"MET Nordics analys täcker inte vintern som förregistreringen kräver (timmarna {v['metnordic'][0]} 00 – "
                          f"{v['metnordic'][1]} 23 UTC, högst {MAX_IFYLLT:.0%} saknat per fält) — vintern läses inte.")
            skriv(s, a.ut); return 1
        D = datamapp(os.path.join(a.arbete, namn), a.indata, a.ifs, timmar)
        del timmar; gc.collect()
        meta, idx, obs, Ts, P, t0 = kandidaten(D, mn_fil, kand, modell)
        hoj = meta.set_index('sid').elev_ifs
        s['indata']['ecmwf'] = dict(fran=str(idx[0]), till=str(idx[-1]), timmar=int(len(idx)), metnordic_fran=str(t0),
                                    hojden_skiljer_fran_2024_25=int((hoj - hoj_2425.reindex(hoj.index)).abs().gt(1).sum()))
        del obs, Ts
    pop, s['vakterna'] = matt.vakter(rader)
    del rader; gc.collect()
    logg(f"vakterna: {s['vakterna']}")
    s['matt'] = mattet(pop, a.indata, meta, idx, P)
    skriv(s, a.ut)
    for namn_s, u in s['matt']['serier'].items():
        c = u['totalt']
        logg(f"{namn_s}: n {c['n']} · A1 {c['A1']} °C · A2 {c['A2']} · A3 {c['A3']}")
    return 0


def samman(filer, ut):
    s = [json.load(open(f, encoding='utf-8')) for f in filer]
    m = matt.samman(s)
    m['_om'] = 'Förregistreringen FLER-VINTRAR §4: de fem äldre vintrarna tillsammans, ur summorna. 2024/25 (i urvalet) räknas inte in.'
    os.makedirs(ut, exist_ok=True)
    with open(os.path.join(ut, 'kuvos-vintrar-samman.json'), 'w', encoding='utf-8') as fh: json.dump(m, fh, ensure_ascii=False, indent=1)
    md = [f"## De äldre vintrarna tillsammans ({', '.join(m['vintrar'])})", ''] + matt.markdown_serier(m['serier'], 'Ur summorna')
    with open(os.path.join(ut, 'kuvos-vintrar-samman.md'), 'w', encoding='utf-8') as fh: fh.write('\n'.join(md) + '\n')
    return m


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--vinter'); ap.add_argument('--kandidat'); ap.add_argument('--modell'); ap.add_argument('--indata')
    ap.add_argument('--urvalet-vvis'); ap.add_argument('--urvalet-metnordic')
    ap.add_argument('--vvis'); ap.add_argument('--ifs'); ap.add_argument('--metnordic', nargs='+', default=[])
    ap.add_argument('--smhi'); ap.add_argument('--arbete'); ap.add_argument('--ut', required=True)
    ap.add_argument('--samman', nargs='+')
    a = ap.parse_args()
    if a.samman:
        samman(a.samman, a.ut); sys.exit(0)
    for k in ('vinter', 'kandidat', 'modell', 'indata', 'urvalet_vvis', 'urvalet_metnordic', 'arbete'):
        if not getattr(a, k): ap.error(f"--{k.replace('_', '-')} krävs")
    if a.vinter != lasare.URVALET:
        for k in ('vvis', 'ifs', 'smhi'):
            if not getattr(a, k): ap.error(f'--{k} krävs för en äldre vinter')
        if not a.metnordic: ap.error('--metnordic krävs för en äldre vinter')
    sys.exit(kor(a))
