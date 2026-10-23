"""Träningen av den nya kandidaten, en enhet per jobb (förregistreringen NY-KANDIDAT-2027-28 §1 och §3, DECISIONS #670).

  python fysik/ny_kandidat/trana.py --plan --prov <mapp med prov_<vinter>.json> --ut <mapp>
      Vilka vintrar som klarat förberedningens prov (§4), och enheterna för flödets matris (kedjan.enheter): den slutliga 'alla',
      ett veck per vinter och ett parveck per par. Vägrar om identitetsprovet på 2024/25 saknas eller föll, om en vinter saknar sin
      förberedning eller sin indata (MET, ECMWF — inget av §4:s prov, så frågan går till Bengt), eller om en förberedning är gjord med
      annan läskod än den som körs nu. En vinter vars tidszonsprov fallit tas bort ur alla prov och redovisas (§4).
  python fysik/ny_kandidat/trana.py --enhet <namn> --prov <mapp> --indata <frusen> --vintrar <rot> --arbete <mapp> --ut <mapp>
      Enheten tränas på sina träningsvintrar med den frysta procedurens (a) och (b) (kedjan.trana) och förutsäger sina utelämnade
      vintrar. <rot>/<vinter>/ har ifs/ och metnordic/ för varje vinter i enheten och vvis/ BARA för träningsvintrarna — finns
      Trafikverkets filer för en utelämnad vinter vägrar körningen. Indatans summor ska vara förberedningens.
Utdata: modell_<enhet>.pkl och ph_<enhet>_<vinter>.npz (till hinken arkiv under kuvos/kuvos-kandidat-2027-28/, aldrig i en artefakt —
modellen är tränad på Trafikverkets rader och skattningarna är räknade ur den) och enhet_<enhet>.json (parametrarna, särdragen, summorna
och storlekarna; i urvalet bara för den slutliga). Inget mått på en utelämnad vinter räknas här: det gör provning.py, bakom spärren.
"""
import argparse, glob, json, os, pickle, platform, sys
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kedjan
from kedjan import logg, sha, summa_mapp, kodsummor, A2_KONFIG


def las_prov(mapp):
    prov = {}
    for f in sorted(glob.glob(os.path.join(mapp, '**', 'prov_*.json'), recursive=True)):
        s = kedjan.las_json(f)
        if s.get('vinter') in kedjan.VINTRAR:
            prov[s['vinter']] = s
    return prov


def plan(prov, kod=None):
    """→ (vintrarna som klarat proven, de borttagna med skäl, enheterna). Kastar om ingenting får läsas."""
    kod = kod or kodsummor()
    i = prov.get(kedjan.lasare.URVALET, {}).get('prov', {}).get('identitetsprov')
    if not i or i.get('klarat') is not True:
        raise SystemExit('planen: identitetsprovet på 2024/25 saknas eller föll — ingen vinter läses (§4); kör förberedningen för 2024-25')
    borta, vintrar = {}, []
    for v in kedjan.VINTRAR:
        s = prov.get(v)
        if s is None:
            raise SystemExit(f'planen: förberedningen saknas för {v} — kör den först (en vinter tas bara bort när ett prov fallit, §4)')
        if s.get('kod') != kod:
            andra = sorted(f for f in kod if s.get('kod', {}).get(f) != kod[f])
            raise SystemExit(f'planen: förberedningen av {v} gjordes med annan läskod ({", ".join(andra)}) — kör om förberedningen')
        if not s.get('data_klarat'):
            raise SystemExit(f"planen: indatan för {v} räcker inte ({s.get('stopp')}) — det är inget av §4:s prov, så ingen vinter tas bort; "
                             "frågan går till Bengt")
        if not s.get('tidszon_klarat'):
            borta[v] = 'tidszonsprovet föll (§4)'
        else:
            vintrar.append(v)
    if len(vintrar) < 3:
        raise SystemExit(f'planen: bara {len(vintrar)} vintrar har klarat proven ({vintrar}) — för få för en vinter i taget utanför')
    return vintrar, borta, kedjan.enheter(vintrar)


def mn_delar(rot, v):
    return sorted(glob.glob(os.path.join(rot, v, 'metnordic', '*.csv.gz')))


def kor_enhet(a):
    prov = las_prov(a.prov)
    vintrar, borta, alla = plan(prov)
    e = kedjan.enhet_av(a.enhet, vintrar)
    logg(f"enheten {e['namn']}: tränar på {', '.join(e['trana'])}; förutsäger {', '.join(e['utan']) or 'ingen (den slutliga)'}"
         + (f"; borttagna vintrar {borta}" if borta else ''))
    # Indatan ska vara förberedningens, och Trafikverkets filer får bara finnas för träningsvintrarna.
    for v in e['trana'] + e['utan']:
        ind = prov[v]['indata']
        ifs = os.path.join(a.vintrar, v, 'ifs')
        if summa_mapp(ifs) != ind['ifs']:
            raise SystemExit(f'{v}: ECMWF-mappen är inte förberedningens')
        mn = {os.path.basename(f): sha(f) for f in mn_delar(a.vintrar, v)}
        if mn != ind['metnordic']:
            raise SystemExit(f'{v}: MET Nordic-delarna är inte förberedningens')
        vv = os.path.join(a.vintrar, v, 'vvis')
        if v in e['utan']:
            if os.path.isdir(vv) and os.listdir(vv):
                raise SystemExit(f'{v} är utelämnad i {e["namn"]}, men Trafikverkets filer för den finns i jobbet — vägrar')
        else:
            filer = kedjan.lasare.hitta(vv, kedjan.lasare.vinter(v)['filer'])
            if {os.path.basename(f): sha(f) for f in filer} != ind['vvis']:
                raise SystemExit(f'{v}: VViS-filerna är inte förberedningens')
    fasta = {f: sha(os.path.join(a.indata, f)) for f in kedjan.vinterkedja.FASTA}
    if any(prov[v]['indata']['fasta'] != fasta for v in e['trana'] + e['utan']):
        raise SystemExit('stationernas fasta data är inte förberedningens')
    os.makedirs(a.ut, exist_ok=True)
    tr = []
    for v in e['trana']:
        w = kedjan.las_vinter(v, a.indata, os.path.join(a.vintrar, v, 'ifs'), mn_delar(a.vintrar, v), a.arbete, vvis=os.path.join(a.vintrar, v, 'vvis'))
        logg(f"{v}: {w['stationer']} stationer, {w['timmar']} timmar, MET Nordic från {w['t0']}, timtabellen {w['timtabellen']}")
        tr.append(w)
    r = kedjan.trana(tr, maxfev=a.maxfev, i_urvalet=not e['utan'])
    del tr
    fil = os.path.join(a.ut, kedjan.modell_fil(e['namn']))
    with open(fil, 'wb') as fh:
        fh.write(r['blob'])
    with open(fil, 'rb') as fh:
        if fh.read() != r['blob']:
            raise RuntimeError(f'{fil}: filen är inte modellen som prövades')
    filer = [fil]
    for v in e['utan']:
        w = kedjan.las_vinter(v, a.indata, os.path.join(a.vintrar, v, 'ifs'), mn_delar(a.vintrar, v), a.arbete, vvis=None)
        P = kedjan.prediktera(w, r['p'], pickle.loads(r['blob']), r['names'])     # modellen som den ligger i filen
        f = os.path.join(a.ut, kedjan.ph_fil(e['namn'], v))
        kedjan.spara_ph(f, P, w['meta'], w['idx'])
        filer.append(f)
        logg(f"{v}: skattningen sparad ({w['stationer']} stationer × {w['timmar']} timmar) — inget mått räknas här")
        del w, P
    import scipy, sklearn
    s = {'_om': ('Den nya kandidaten för 2027/28 (förregistreringen NY-KANDIDAT-2027-28, DECISIONS #670): en enhet av träningen. Filerna '
                 f'ligger i hinken arkiv under kuvos/{kedjan.HINKMAPP}/ och aldrig i repot eller en artefakt.'),
         'enhet': e['namn'], 'tranad_pa': e['trana'], 'utelamnade': e['utan'], 'vintrar': vintrar, 'borttagna': borta,
         'fysik': 'lw med långvågen ur fysikens reserv', 'parametrar': {k: float(v) for k, v in r['p'].items()},
         'kalibrering': {'utvarderingar': r['k']['evals'], 'maxfev': a.maxfev, 'start': 'physics.DEFAULT (vagb.DEFAULT)', 'n': r['k']['train']['n']},
         'sardrag': r['names'], 'rattelse': dict(A2_KONFIG), 'kolumner': r['kolumner'], 'timmar': r['timmar'], 'stationer': r['stationer'],
         'indata': {v: prov[v]['indata'] for v in e['trana'] + e['utan']}, 'kod': kodsummor(),
         'versioner': {'python': platform.python_version(), 'numpy': np.__version__, 'pandas': pd.__version__, 'scipy': scipy.__version__,
                       'scikit-learn': sklearn.__version__},
         'filer': [{'fil': os.path.basename(f), 'bytes': os.path.getsize(f), 'sha256': sha(f)} for f in filer]}
    if r['urvalet']:
        s['i_urvalet'] = r['urvalet']
    with open(os.path.join(a.ut, f"enhet_{e['namn']}.json"), 'w', encoding='utf-8') as fh:
        json.dump(s, fh, ensure_ascii=False, indent=1)
    logg(f"enhet_{e['namn']}.json: " + json.dumps({k: s[k] for k in ('enhet', 'tranad_pa', 'utelamnade', 'filer')}, ensure_ascii=False))
    if r['urvalet']:
        u = r['urvalet']['alla']
        logg(f"i urvalet (vintrarna den slutliga tränade på, inte det väntade felet): fysik A2 {100 * u['fysik']['A2']:.2f} %, "
             f"fysik + rättelse A1 {u['fysik_rattelse']['A1']:.3f} °C, A2 {100 * u['fysik_rattelse']['A2']:.2f} % på n {u['fysik_rattelse']['n']}")
    return 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--plan', action='store_true'); ap.add_argument('--enhet'); ap.add_argument('--prov', required=True)
    ap.add_argument('--indata'); ap.add_argument('--vintrar'); ap.add_argument('--arbete'); ap.add_argument('--ut', required=True)
    ap.add_argument('--maxfev', type=int, default=120)
    a = ap.parse_args()
    if a.plan:
        vintrar, borta, alla = plan(las_prov(a.prov))
        os.makedirs(a.ut, exist_ok=True)
        json.dump(alla, open(os.path.join(a.ut, 'enheter.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        print(f"vintrarna: {', '.join(vintrar)}" + (f"; borttagna (§4): {json.dumps(borta, ensure_ascii=False)}" if borta else '; ingen borttagen'))
        print(f"{len(alla)} enheter: den slutliga, {len(vintrar)} veck och {len(alla) - 1 - len(vintrar)} parveck")
        sys.exit(0)
    for k in ('enhet', 'indata', 'vintrar', 'arbete'):
        if not getattr(a, k): ap.error(f'--{k} krävs')
    sys.exit(kor_enhet(a))
