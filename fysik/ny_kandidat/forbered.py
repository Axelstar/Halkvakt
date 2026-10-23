"""Förberedningen av en vinter för den nya kandidaten (förregistreringen NY-KANDIDAT-2027-28 §2 och §4, DECISIONS #670): proven före
läsningen och summorna på indatan, så att träningen och prövningen bara tar vintrar som klarat proven, med just den indatan.

Proven, med fysik/vintrar:s egen kod oförändrad:
  - identitetsprovet på 2024/25 (§4, FORREGISTRERING-FLER-VINTRAR §3 a): vinterkedja.identitetsprov — den frysta kandidaten i samma
    läsväg (lasare → datamapp → common.load + load_mn) ska ge kandidatfilens tal i urvalet. Det görs i förberedningen av 2024-25 och
    faller allt om det faller (trana.py --plan kräver det);
  - tidszonsprovet för varje vinter (där §3 b): sommartidsnatten utan rader (lasare.sommartidsprov) och SMHI:s förskjutning 0 h
    (tidszon.provet), också för 2024/25, som här är en provvinter bland de sex;
  - MET-provet utan långvågen (kedjan.mn_prov): timmarna 31/10 00 – 31/3 23 UTC och högst MAX_IFYLLT saknat i de sex fälten;
  - ECMWF: vinterns timmar för varje station (som hamta_ifs.py prövar efter hämtningen).
Faller tidszonsprovet tas vintern bort ur alla prov (§4); faller identitetsprovet läses ingen vinter; räcker indatan inte (MET, ECMWF)
stannar planen, eftersom det inte är ett av §4:s prov (trana.py --plan). Summorna (VViS-filerna, ECMWF-mappen, MET-delarna och
koden som läser en vinter) skrivs bredvid, och träningen vägrar en vinter vars indata eller läskod inte är densamma.

Utdata (--ut): prov_<vinter>.json och .md, bara aggregat. Trafikverkets rader stannar i --arbete, som ingen artefakt tar.

  python fysik/ny_kandidat/forbered.py --vinter 2022-23 --indata <frusen> --vvis <vinterns VViS> --ifs <vinterns ifs/>
      --metnordic <delarna …> --smhi <cache> --arbete <mapp> --ut <mapp>
  python fysik/ny_kandidat/forbered.py --vinter 2024-25 … --kandidat kuvos/kandidat-2026-27.json --modell modell.pkl
      --urvalet-metnordic <metnordic_2024-25.csv.gz>          (identitetsprovet med kuvösens analysfil, långvågen orörd)
"""
import argparse, json, os, platform, sys
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kedjan
from kedjan import lasare, vinterkedja, logg, sha, summa_mapp, kodsummor, stationer
import tidszon, matt


def ecmwf_prov(ifs, sids, fran, till):
    """Varje station har en fil med vinterns timmar fran 00 – till 23 (hamta_ifs.py:s prov, utan att något hämtas)."""
    vantade = list(pd.date_range(fran, pd.Timestamp(till) + pd.Timedelta(hours=23), freq='h').strftime('%Y-%m-%dT%H:%M'))
    saknas, fel = [], []
    for s in sids:
        f = os.path.join(ifs, f'{s}.csv')
        if not os.path.exists(f):
            saknas.append(s); continue
        if list(pd.read_csv(f, usecols=['time']).time) != vantade:
            fel.append(s)
    return dict(stationer=len(sids), saknas=len(saknas), andra_timmar=len(fel), timmar=len(vantade), klarat=not saknas and not fel)


def forbered(a):
    namn = a.vinter
    v = lasare.vinter(namn)
    st = stationer(a.indata); sids = st.sid.tolist()
    s = dict(_om='Förregistreringen NY-KANDIDAT-2027-28 (DECISIONS #670): proven före läsningen och summorna för en vinter. Bara aggregat.',
             vinter=namn, kod=kodsummor(), versioner=dict(python=platform.python_version(), numpy=np.__version__, pandas=pd.__version__))
    filer = lasare.hitta(a.vvis, v['filer'])
    s['indata'] = {'vvis': {os.path.basename(f): sha(f) for f in filer}, 'ifs': summa_mapp(a.ifs),
                   'metnordic': {os.path.basename(f): sha(f) for f in sorted(a.metnordic)},
                   'fasta': {f: sha(os.path.join(a.indata, f)) for f in vinterkedja.FASTA}}
    prov = {}
    if namn == lasare.URVALET:
        if not (a.kandidat and a.modell and a.urvalet_metnordic):
            raise SystemExit('identitetsprovet på 2024/25 kräver --kandidat, --modell och --urvalet-metnordic')
        kand, modell, msha = vinterkedja.ladda(a.kandidat, a.modell)
        ident, _, _ = vinterkedja.identitetsprov(kand, modell, a.indata, a.vvis, a.urvalet_metnordic, os.path.join(a.arbete, 'identitet'))
        ident['modell_sha256'] = msha
        prov['identitetsprov'] = ident
        del modell
    # Tidszonen: raderna som databasen bär dem (luften per hel lokal timme och sommartidsnatten), sedan SMHI.
    rader, n_rad, luft, natt = lasare.rader(filer, v['fran'], v['till'], sids)
    pop, vakt = matt.vakter(rader)
    del rader
    s['vvis'] = {'raderna': n_rad, 'vakterna': vakt}
    prov['sommartid'] = {'datum': str(v['sommartid'].date()), **lasare.sommartidsprov(natt)}
    prov['smhi'] = tidszon.provet(luft, st, v['fran'], v['till'], a.smhi)
    del luft, pop
    _, s['vvis']['timtabellen'], _ = lasare.prep_tabell(filer, v['fran'], v['till'], sids)
    mn = kedjan.metnordic_fil(namn, a.metnordic, a.arbete)
    prov['metnordic'] = dict(delar=len(a.metnordic), **kedjan.mn_prov(mn, sids, *v['metnordic']))
    os.remove(mn)
    prov['ecmwf'] = ecmwf_prov(a.ifs, sids, *v['ifs'])
    s['prov'] = prov
    s['tidszon_klarat'] = bool(prov['sommartid']['klarat'] and prov['smhi']['klarat'])
    s['data_klarat'] = bool(prov['metnordic']['klarat'] and prov['ecmwf']['klarat'])
    s['klarat'] = bool(s['tidszon_klarat'] and s['data_klarat'] and (namn != lasare.URVALET or prov['identitetsprov']['klarat']))
    stopp = []
    if namn == lasare.URVALET and not prov['identitetsprov']['klarat']:
        stopp.append('identitetsprovet föll: ingen vinter läses (§4), och felet söks')
    if not s['tidszon_klarat']:
        stopp.append(f'tidszonsprovet föll för {namn}: vintern tas bort ur alla prov (§4)')
    if not s['data_klarat']:
        stopp.append(f'indatan för {namn} räcker inte (MET Nordic eller ECMWF): planen stannar, och frågan går till Bengt')
    if stopp:
        s['stopp'] = '; '.join(stopp)
    skriv(s, a.ut)
    return 0 if s['klarat'] else 1


def markdown(s):
    p = s['prov']
    ut = [f"## Den nya kandidaten: förberedningen av {s['vinter'].replace('-', '/')} (förregistreringen NY-KANDIDAT-2027-28)", '']
    i = p.get('identitetsprov')
    if i:
        ut.append(f"- **Identitetsprovet** på 2024/25 (den frysta kandidaten i samma läsväg): n {matt.tal(i['n'])} (krav {matt.tal(i['krav']['n'])}), "
                  f"A1 {matt.grad(i['A1'], 5)} (krav {matt.grad(i['krav']['A1'], 5)} ± 0,01 °C), A2 {matt.pct(i['A2'], 4)} "
                  f"(krav {matt.pct(i['krav']['A2'], 4)} ± 0,02 pe) → **{'KLARAT' if i['klarat'] else 'FALLER'}**.")
    so = p['sommartid']
    ut.append(f"- **Sommartidsnatten** {so['datum']}: rader per lokal timme 00–09 "
              f"{' · '.join('{} {}'.format(k, matt.tal(x)) for k, x in so['rader_per_lokal_timme'].items())} → **{'KLARAT' if so['klarat'] else 'FALLER'}**.")
    sm = p['smhi']
    ut.append(f"- **SMHI**: {len(sm['par'])} par av {sm['kandidatpar']} kandidater, toppen vid "
              f"{', '.join('{}/{} {:+d} h'.format(x['vvis'], x['namn'], x['bast']) for x in sm['par'])} → **{'KLARAT' if sm['klarat'] else 'FALLER'}** ({sm['regel']}).")
    mn = p['metnordic']
    ut.append(f"- **MET Nordic** utan långvåg ({mn['delar']} delar): {mn['forsta']} – {mn['sista']}, saknat per fält "
              f"{json.dumps(mn['andel_saknad'], ensure_ascii=False)} → **{'KLARAT' if mn['klarat'] else 'FALLER'}** (långvågen: {mn['langvag']}).")
    ec = p['ecmwf']
    ut.append(f"- **ECMWF**: {ec['stationer']} stationer, {ec['saknas']} saknas, {ec['andra_timmar']} med andra timmar än vinterns {ec['timmar']} "
              f"→ **{'KLARAT' if ec['klarat'] else 'FALLER'}**.")
    ut += ['', f"- VViS: {json.dumps(s['vvis'], ensure_ascii=False)}"]
    if s.get('stopp'):
        ut += ['', f"**Stopp:** {s['stopp']}"]
    return '\n'.join(ut) + '\n'


def skriv(s, ut):
    os.makedirs(ut, exist_ok=True)
    bas = os.path.join(ut, f"prov_{s['vinter']}")
    with open(bas + '.json', 'w', encoding='utf-8') as fh: json.dump(s, fh, ensure_ascii=False, indent=1)
    with open(bas + '.md', 'w', encoding='utf-8') as fh: fh.write(markdown(s))
    logg(f"förberedningen: {bas}.json och .md — {'KLARAT' if s['klarat'] else 'FALLER'}")


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--vinter', required=True, choices=kedjan.VINTRAR); ap.add_argument('--indata', required=True)
    ap.add_argument('--vvis', required=True); ap.add_argument('--ifs', required=True); ap.add_argument('--metnordic', nargs='+', required=True)
    ap.add_argument('--smhi', required=True); ap.add_argument('--arbete', required=True); ap.add_argument('--ut', required=True)
    ap.add_argument('--kandidat'); ap.add_argument('--modell'); ap.add_argument('--urvalet-metnordic')
    sys.exit(forbered(ap.parse_args()))
