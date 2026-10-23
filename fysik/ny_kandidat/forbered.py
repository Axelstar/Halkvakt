"""Förberedningen av en vinter för den nya kandidaten (förregistreringen NY-KANDIDAT-2027-28 §2 och §4, DECISIONS #670): proven före
läsningen och summorna på indatan, så att träningen och prövningen bara tar vintrar som klarat proven, med just den indatan.

Proven, med fysik/vintrar:s egen kod oförändrad:
  - identitetsprovet på 2024/25 (§4, FORREGISTRERING-FLER-VINTRAR §3 a): vinterkedja.identitetsprov — den frysta kandidaten i samma
    läsväg (lasare → datamapp → common.load + load_mn) ska ge kandidatfilens tal i urvalet. Det görs i förberedningen av 2024-25 och
    faller allt om det faller (trana.py --plan kräver det);
  - tidszonsprovet för varje vinter (där §3 b): sommartidsnatten utan rader (lasare.sommartidsprov) och SMHI:s förskjutning 0 h
    (tidszon.provet), också för 2024/25, som här är en provvinter bland de sex. SMHI:s station 7 ("Gävle", Övriga stationer) tas ur
    stationslistan innan paren väljs (tillägget T1, docs/FORREGISTRERING-NY-KANDIDAT-TILLAGG-2026-10-23.md): dess klocka ligger en
    timme efter SMHI:s Gävle A och fyra VViS-stationer 2018–2022. tidszon.py är orörd, så FLER-VINTRAR:s prov för den frysta är detsamma;
  - MET-provet utan långvågen (kedjan.mn_prov): timmarna 31/10 00 – 31/3 23 UTC och högst MAX_IFYLLT saknat i de sex fälten, prövat på
    delarna efter fyllningen (tillägget T2: timmar som arkivet saknar tagna ur MET:s omräkning v4); --fyllt redovisar hur många;
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

# Tillägget T1: SMHI-stationer som inte räknas i tidszonsprovet, med skälet. Bara referensen ändras; regeln (topp vid 0 h, minst fem
# par), avståndet, banden och två par per band står kvar.
UTESLUTNA_SMHI = {'7': 'Gävle (Övriga stationer, 2017–2022): klockan en timme efter SMHI:s Gävle A och fyra VViS-stationer (T1)'}


def smhi_lista(cache):
    """SMHI:s stationslista för parameter 1 (tidszon.LISTA, samma cache som tidszon.provet) utan UTESLUTNA_SMHI."""
    os.makedirs(cache, exist_ok=True)
    lista = json.load(open(tidszon.hamta_fil(tidszon.LISTA, os.path.join(cache, 'smhi_p1.json')), encoding='utf-8'))
    return {**lista, 'station': [s for s in lista['station'] if str(s['key']) not in UTESLUTNA_SMHI]}


def fyllt_summa(filer):
    """Tillägget T2: fyllningens listor (fyllt_<del>.json ur metnordic_reserv.ts --fyll) → timmarna per källa för vintern."""
    s = dict(delar=0, saknade_fore=0, ur_arkivet=0, ur_v4=0, saknas_i_bada=0)
    for f in filer or []:
        if not os.path.exists(f):
            continue
        j = json.load(open(f, encoding='utf-8'))
        s['delar'] += 1
        s['saknade_fore'] += len(j['saknade_fore'])
        for k in ('ur_arkivet', 'ur_v4', 'saknas_i_bada'):
            s[k] += len(j[k])
    return s


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
    prov['smhi'] = tidszon.provet(luft, st, v['fran'], v['till'], a.smhi, lista=smhi_lista(a.smhi))
    prov['smhi']['uteslutna'] = UTESLUTNA_SMHI
    del luft, pop
    _, s['vvis']['timtabellen'], _ = lasare.prep_tabell(filer, v['fran'], v['till'], sids)
    mn = kedjan.metnordic_fil(namn, a.metnordic, a.arbete)
    prov['metnordic'] = dict(delar=len(a.metnordic), **kedjan.mn_prov(mn, sids, *v['metnordic']))
    prov['metnordic']['fyllt'] = fyllt_summa(getattr(a, 'fyllt', None))
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
              f"{', '.join('{}/{} {:+d} h'.format(x['vvis'], x['namn'], x['bast']) for x in sm['par'])} → **{'KLARAT' if sm['klarat'] else 'FALLER'}** ({sm['regel']})"
              + (f"; SMHI-station {', '.join(sm['uteslutna'])} utesluten (T1)" if sm.get('uteslutna') else '') + '.')
    mn = p['metnordic']
    fy = mn.get('fyllt') or {}
    ut.append(f"- **MET Nordic** utan långvåg ({mn['delar']} delar): {mn['forsta']} – {mn['sista']}, saknat per fält "
              f"{json.dumps(mn['andel_saknad'], ensure_ascii=False)} → **{'KLARAT' if mn['klarat'] else 'FALLER'}** (långvågen: {mn['langvag']})"
              + (f"; fyllt (T2): {fy['saknade_fore']} timmar saknades i arkivet, {fy['ur_arkivet']} fanns där vid omhämtningen, {fy['ur_v4']} ur v4, "
                 f"{fy['saknas_i_bada']} saknas i båda" if fy.get('delar') else '') + '.')
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
    ap.add_argument('--fyllt', nargs='*', default=[], help='fyllningens listor (T2), fyllt_<del>.json')
    sys.exit(forbered(ap.parse_args()))
