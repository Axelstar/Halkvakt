"""Prövningen av den nya kandidaten, en vinter i taget utanför (förregistreringen NY-KANDIDAT-2027-28 §3, DECISIONS #670).

SPÄRREN FÖRST: varje läge som räknar ett utfall vägrar (utgångskod 2) innan något läses, om förregistreringen inte är signerad
(sparren.py: statusraden **Status: SIGNERAD och båda signaturerna, som kuvos/facit-trv.ts).

  python fysik/ny_kandidat/provning.py --sparren
  python fysik/ny_kandidat/provning.py --plan --enheter <enhet_*.json>         vecken för flödets matris (varje skattning ska finnas)
  python fysik/ny_kandidat/provning.py --behov <vinter|alla> --enheter <…>     skattningarna vecket hämtar ur hinken (inga utfall)
  python fysik/ny_kandidat/provning.py --veck <vinter> --enheter <enhet_*.json> --ph <mapp> --vvis <rot> --indata <frusen> --ut <mapp>
      Vecket där <vinter> hålls utanför:
        1. paret väljs bland väg B:s 15 par (fysik/blandning/vagb_blandning.py GRID) på de andra vintrarna: varje träningsvinter j
           skattas av parvecket utan j och vintern (kedjan.parvalets_skattningar) — en modell som varken sett j eller den utelämnade
           vintern — och blandas som den levande kedjan (kandidat_timme.timme(), stationens egen mätning utesluten) på grind A:s
           population (matt.py). Paret med minst andel grova fel (> 2 °C) över träningsvintrarna tillsammans väljs, vid lika det första
           i rutnätets ordning (som vagb_blandning.valj). Ingen rad ur den utelämnade vintern läses före valet eller i det;
        2. måtten på den utelämnade vintern med vecket utan den och det valda paret: matt.matt() oförändrad (RÅ, NIVÅ 2, NIVÅ 2+BLANDNING;
           A1, A2, A3 med n och marginaler; per band, norr och söder, månad).
  python fysik/ny_kandidat/provning.py --veck alla …
      Paret för den slutliga kandidaten, på alla vintrar med varje vinters ärliga skattning ur sitt eget veck (väg B:s 'på alla veck',
      #544 punkt 6).
  python fysik/ny_kandidat/provning.py --samman <mapp med veck_*.json> --enheter <…> [--frysta kuvos-vintrar-2022-23.json] --ut <mapp>
      Per utelämnad vinter, medel över vintrarna (det enkla medlet av vintrarnas A1, A2 och A3) och ur summorna (matt.samman, som
      FLER-VINTRAR); jämförelsen med den frysta bara på 2022/23; och kandidatfilen (kuvos/kandidat-2027-28.json): parametrarna, paret,
      summorna och talen i urvalet.

Parvalet räknar de 15 paren exakt som timme() skulle: timme() körs en gång per halvtimme (matt.blandning) med avrundningen avslagen
(utan_avrundning), och varje pars PB är np.round(vagb_blandning.blanda(RÅ, PH + CORR, ANK, W, L), 2) — samma uttryck som timme():s
två rader, med samma avrundning. Självtestet visar att det ger timme():s PB bit för bit för alla 15 paren.
Allt som lämnar modulen är aggregat.
"""
import contextlib, glob, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sparren

if __name__ == '__main__' and '--sparren' in sys.argv:          # spärren utan något annat inläst
    sparren.vagra_osignerad()
    print('spärren: förregistreringen är signerad — prövningen får skriva ut utfall')
    sys.exit(0)

import numpy as np
import pandas as pd
import kedjan
from kedjan import lasare, logg, sha
import matt
from vagb_blandning import GRID, blanda

REGEL = 'minst andel grova fel (> 2 °C) på grind A:s population över träningsvintrarna tillsammans; vid lika det första i rutnätet'


class _UtanAvrundning:
    """numpy med np.round som identitet: kandidat_timme.timme():s värden före avrundningen."""
    def __getattr__(self, namn):
        return getattr(np, namn)

    @staticmethod
    def round(x, *a, **k):
        return x


@contextlib.contextmanager
def utan_avrundning():
    g = matt.timme.__globals__
    gammal = g['np']; g['np'] = _UtanAvrundning()
    try:
        yield
    finally:
        g['np'] = gammal


@contextlib.contextmanager
def paret(W, L):
    """matt.blandning läser paret ur den frysta kandidatfilen (kandidat_timme.par); här är det vecket valda."""
    gammal = matt.par
    matt.par = lambda *a, **k: (float(W), float(L))
    try:
        yield
    finally:
        matt.par = gammal


def komponenter(pop, pos_df, PH, idx, kedjans, logg_=None):
    """matt.matt():s punkter (grind A:s population där RÅ, PH och PB har värde) och blandningens delar före avrundningen: mätt yta,
    PH (halvtimmen, avrundad som matt.py), RÅ, CORR och ANK. Raderna före blandning() är matt.matt():s, i samma ordning."""
    pos = pos_df.set_index('sid')
    st = sorted(pop.sid.unique())
    M, b0 = matt.matris(pop, st)
    RA, ANK = matt.ra_grind_a(M, pos.lon.reindex(st).to_numpy(float), pos.lat.reindex(st).to_numpy(float))
    nb = M.shape[0]
    PH2 = np.round(matt.halvtimmar(PH, idx, b0, nb), 2)
    kol = {s: i for i, s in enumerate(kedjans)}
    r, c = np.nonzero(np.isfinite(RA))
    kc = np.array([kol.get(st[x], -1) for x in c], dtype=int)
    med_ph = (kc >= 0)
    med_ph[med_ph] = np.isfinite(PH2[r[med_ph], kc[med_ph]])
    r, c, kc = r[med_ph], c[med_ph], kc[med_ph]
    punkter_b = {}
    for bb, j in zip(r + b0, kc): punkter_b.setdefault(int(bb), []).append(int(j))
    klon = pos.lon.reindex(kedjans).to_numpy(float); klat = pos.lat.reindex(kedjans).to_numpy(float)
    with utan_avrundning():
        ut, _, _ = matt.blandning(pop, PH2, kedjans, klon, klat, b0, punkter_b, logg_)
    x = np.array([ut.get((int(bb), int(j)), (np.nan,) * 4) for bb, j in zip(r + b0, kc)], dtype=float).reshape(-1, 4)
    med = np.isfinite(x[:, 0])
    return dict(meas=M[r, c][med], ph=PH2[r, kc][med], corr=x[med, 1], ra=x[med, 2], ank=x[med, 3])


def pb_for(d, W, L):
    """Parets PB som timme() räknar det: wb = W·exp(−ANK/L), PB = wb·RÅ + (1 − wb)·PG där RÅ finns, avrundat till hundradelar."""
    return np.round(blanda(d['ra'], d['ph'] + d['corr'], d['ank'], W, L), 2)


def raknat(d, grid=GRID):
    """{par: (grova fel, punkter)} på en vinters punkter."""
    return {par: (int((np.abs(pb_for(d, *par) - d['meas']) > 2).sum()), int(len(d['meas']))) for par in grid}


def valj_par(rakningar, grid=GRID):
    """rakningar: en raknat() per träningsvinter. → (paret, tabellen {par: (grova, n)} över vintrarna tillsammans)."""
    tab = {par: (sum(r[par][0] for r in rakningar), sum(r[par][1] for r in rakningar)) for par in grid}
    if any(n == 0 for _, n in tab.values()):
        raise RuntimeError('parvalet: inga punkter på träningsvintrarna')
    return min(grid, key=lambda par: tab[par][0] / tab[par][1]), tab


def mat_vinter(pop, pos_df, PH, idx, kedjans, par, logg_=None):
    """FLER-VINTRAR §4 för en vinter: matt.matt() oförändrad, med paret."""
    with paret(*par):
        m = matt.matt(pop, pos_df, PH, idx, kedjans, logg_ or (lambda s: None))
    if (m['population']['par']['W'], m['population']['par']['L_km']) != (float(par[0]), float(par[1])):
        raise RuntimeError(f"matt.matt räknade med paret {m['population']['par']}, inte {par}")
    return m


def las_pop(vinter, vvis_rot, sids, vantat=None):
    """Grind A:s population för en vinter ur Trafikverkets filer (lasare.rader → matt.vakter), med filernas summor mot förberedningens."""
    v = lasare.vinter(vinter)
    filer = lasare.hitta(os.path.join(vvis_rot, vinter), v['filer'])
    if vantat is not None and {os.path.basename(f): sha(f) for f in filer} != vantat:
        raise SystemExit(f'{vinter}: VViS-filerna är inte förberedningens')
    rader, n_rad, _, _ = lasare.rader(filer, v['fran'], v['till'], sids)
    pop, n = matt.vakter(rader)
    return pop, {'raderna': n_rad, 'vakterna': n}


def las_enheter(filer):
    enh = {}
    for f in filer:
        for g in (sorted(glob.glob(os.path.join(f, '**', 'enhet_*.json'), recursive=True)) if os.path.isdir(f) else [f]):
            s = kedjan.las_json(g); enh[s['enhet']] = s
    if 'alla' not in enh:
        raise SystemExit('enheterna: den slutliga (alla) saknas')
    return enh


def manifestets_summor(fil=kedjan.MANIFEST):
    """Summorna i kuvos/kandidat-2027-28.json när den är ifylld efter samman (före det är listan tom)."""
    try:
        return {f['fil']: f['sha256'] for f in kedjan.las_json(fil).get('filer') or []}
    except FileNotFoundError:
        return {}


def ph_ur(enh, ph_mapp, enhet, vinter):
    """En enhets skattning av en vinter, med summan mot enhetens fil och, när den är ifylld, mot kandidatfilen i repot."""
    namn = kedjan.ph_fil(enhet, vinter)
    if enhet not in enh:
        raise SystemExit(f'enheten {enhet} saknas — träningen är inte klar')
    vantad = next((f['sha256'] for f in enh[enhet]['filer'] if f['fil'] == namn), None)
    fil = os.path.join(ph_mapp, namn)
    if vantad is None or sha(fil) != vantad:
        raise SystemExit(f'{namn}: summan stämmer inte med enhet_{enhet}.json')
    m = manifestets_summor()
    if m and m.get(namn) != vantad:
        raise SystemExit(f'{namn}: summan stämmer inte med {os.path.relpath(kedjan.MANIFEST, kedjan.ROT)}')
    return kedjan.las_ph(fil), vantad


def behov(veck_, vintrar):
    """Skattningarna ett veck läser: parvalets och, för en utelämnad vinter, vinterns egen ur vecket utan den."""
    ut = [kedjan.ph_fil(e, j) for j, e in kedjan.parvalets_skattningar(veck_, vintrar)]
    if veck_ != 'alla':
        ut.append(kedjan.ph_fil(kedjan.enhetsnamn([veck_]), veck_))
    return ut


def plan(enh):
    """Vecken för flödets matris (varje vinter och 'alla'), sedan varje skattning de läser finns i en enhetsfil."""
    vintrar = enh['alla']['vintrar']
    finns = {f['fil'] for e in enh.values() for f in e['filer']}
    saknas = sorted({f for v in vintrar + ['alla'] for f in behov(v, vintrar)} - finns)
    if saknas:
        raise SystemExit(f'planen: {len(saknas)} skattningar saknas i enhetsfilerna ({saknas[:4]} …) — träningen är inte klar')
    return vintrar + ['alla']


def tabell_ut(tab):
    return {f'W {w:g} · L {l:g} km': {'grova': g, 'n': n, 'andel': g / n} for (w, l), (g, n) in tab.items()}


def veck(a):
    sparren.vagra_osignerad()
    enh = las_enheter(a.enheter)
    vintrar = enh['alla']['vintrar']
    pos = kedjan.stationer(a.indata); sids = pos.sid.tolist()
    vvis_sha = {v: enh['alla']['indata'][v]['vvis'] for v in vintrar}
    skattningar = kedjan.parvalets_skattningar(a.veck, vintrar)
    logg(f"vecket {a.veck}: paret väljs på {', '.join(f'{j} ur {e}' for j, e in skattningar)}")
    rakningar, info = [], {}
    for j, enhet in skattningar:                             # bara träningsvintrarna — den utelämnade läses inte här
        (PH, idx, ked), s_ph = ph_ur(enh, a.ph, enhet, j)
        pop, n = las_pop(j, a.vvis, sids, vvis_sha[j])
        rakningar.append(raknat(komponenter(pop, pos, PH, idx, ked)))
        info[j] = {'enhet': enhet, 'ph_sha256': s_ph, 'punkter': rakningar[-1][GRID[0]][1], **n}
        del PH, pop
    par, tab = valj_par(rakningar)
    logg(f"paret: W {par[0]:g} · L {par[1]:g} km ({REGEL})")
    s = {'_om': ('Förregistreringen NY-KANDIDAT-2027-28 §3 (DECISIONS #670): ' + ('paret för den slutliga kandidaten, på alla vintrars ärliga '
                                                                               'skattningar.' if a.veck == 'alla' else 'vecket där vintern hålls utanför.')
                 + ' Bara aggregat.'),
         'vinter': a.veck, 'i_urvalet': False, 'par': {'W': par[0], 'L_km': par[1]},
         'parvalet': {'regel': REGEL, 'vintrar': info, 'tabell': tabell_ut(tab)}}
    if a.veck != 'alla':
        enhet = kedjan.enhetsnamn([a.veck])
        (PH, idx, ked), s_ph = ph_ur(enh, a.ph, enhet, a.veck)
        pop, n = las_pop(a.veck, a.vvis, sids, vvis_sha[a.veck])
        s['kandidat'] = {'enhet': enhet, 'tranad_pa': enh[enhet]['tranad_pa'], 'ph_sha256': s_ph,
                         'modell_sha256': next((f['sha256'] for f in enh[enhet]['filer'] if f['fil'] == kedjan.modell_fil(enhet)), None)}
        s['indata'] = n
        s['matt'] = mat_vinter(pop, pos, PH, idx, ked, par, logg)
    skriv_veck(s, a.ut)
    return 0


def markdown_veck(s):
    v = s['vinter']
    if v == 'alla':
        ut = ['## Den nya kandidaten: paret för den slutliga, på alla vintrar (förregistreringen NY-KANDIDAT-2027-28 §3)', '']
    else:
        ut = [f"## Den nya kandidaten, {v.replace('-', '/')} utanför (förregistreringen NY-KANDIDAT-2027-28 §3)", '',
              f"Tränad på {', '.join(s['kandidat']['tranad_pa'])}; modellen {(s['kandidat']['modell_sha256'] or '')[:8]}…, skattningen "
              f"{s['kandidat']['ph_sha256'][:8]}…. Ingen del av {v.replace('-', '/')} är använd i träningen eller i valet av par.", '']
    ut += [f"**Paret:** W {str(s['par']['W']).replace('.', ',')} · L {s['par']['L_km']:g} km — {s['parvalet']['regel']}, på "
           f"{', '.join(s['parvalet']['vintrar'])}.", '', '| Par | grova fel | n | andel |', '| :-- | --: | --: | --: |']
    for k, c in s['parvalet']['tabell'].items():
        ut.append(f"| {k} | {matt.tal(c['grova'])} | {matt.tal(c['n'])} | {matt.pct(c['andel'])} |")
    m = s.get('matt')
    if m:
        ut += ['', f"### Måtten — grind A:s population: {matt.tal(m['population']['punkter'])} punkter vid {m['population']['stationer']} stationer "
                   f"(norr {matt.tal(m['population']['norr'])}, söder {matt.tal(m['population']['soder'])})", '']
        ut += matt.markdown_serier(m['serier'], 'RÅ, NIVÅ 2 och NIVÅ 2+BLANDNING (felmarginal 1,96 · standardfel)')
    return '\n'.join(ut) + '\n'


def skriv_veck(s, ut):
    os.makedirs(ut, exist_ok=True)
    bas = os.path.join(ut, f"veck_{s['vinter']}")
    with open(bas + '.json', 'w', encoding='utf-8') as fh: json.dump(s, fh, ensure_ascii=False, indent=1)
    with open(bas + '.md', 'w', encoding='utf-8') as fh: fh.write(markdown_veck(s))
    logg(f'vecket: {bas}.json och .md')


# ── Samman ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def manadsnyckel(k):
    return f'månad {k[5:]}' if len(k) == 7 and k[4] == '-' else k


def medel_over(serier_per_vinter):
    """Det enkla medlet över vintrarna av A1, A2 och A3 i varje cell (totalt, banden, norr, söder, månaden i året), med antalet
    vintrar som har cellen och n summerat."""
    ut = {}
    for namn in matt.SERIER:
        celler = {}
        for v, se in serier_per_vinter.items():
            u = se[namn]
            par = [('totalt', u['totalt']), ('norr', u['norr']), ('soder', u['soder'])] + [(f'band {b}', c) for b, c in u['band'].items()] \
                + [(manadsnyckel(m), c) for m, c in u['manad'].items()]
            for k, c in par:
                if c and c['n']:
                    celler.setdefault(k, []).append(c)
        ut[namn] = {k: {'vintrar': len(cs), 'n': sum(c['n'] for c in cs),
                        **{x: (sum(c[x] for c in cs) / len(cs) if all(c[x] is not None for c in cs) else None) for x in ('A1', 'A2', 'A3')}}
                    for k, cs in celler.items()}
    return ut


def kandidatfilen(enh, alla, forreg=sparren.FORREG):
    """kuvos/kandidat-2027-28.json: parametrarna, paret, summorna för hinkens filer och talen i urvalet — inga rader."""
    f = enh['alla']
    filer = []
    for namn in sorted(enh, key=lambda n: (n != 'alla', len(n), n)):
        for x in enh[namn]['filer']:
            filer.append({'enhet': namn, **x})
    return {'_om': ('Den nya kandidaten för vintern 2027/28 (förregistreringen NY-KANDIDAT-2027-28, DECISIONS #670), skriven av '
                    'fysik/ny_kandidat/provning.py --samman. Modellerna och skattningarna ligger i hinken arkiv under '
                    f'kuvos/{kedjan.HINKMAPP}/ och aldrig i repot; den slutliga är modell_alla.pkl. Talen under i_urvalet är räknade på '
                    'vintrarna proceduren tränade på och är inte kandidatens väntade fel; det är de sex proven en vinter i taget utanför.'),
            'beslut': '#670', 'forregistrering': {'fil': os.path.relpath(forreg, kedjan.ROT).replace('\\', '/'), 'sha256': sha(forreg)},
            'procedur': kedjan.las_json(kedjan.MANIFEST)['procedur'],
            'fysik': f['fysik'], 'vintrar': f['vintrar'], 'borttagna': f['borttagna'],
            'par': alla['par'], 'parametrar': f['parametrar'], 'kalibrering': f['kalibrering'], 'sardrag': f['sardrag'],
            'rattelse': f['rattelse'], 'stationer': f['stationer'], 'timmar': f['timmar'], 'i_urvalet': f.get('i_urvalet'),
            'versioner': f['versioner'], 'filer': filer}


def samman(a):
    sparren.vagra_osignerad()
    enh = las_enheter(a.enheter)
    vintrar = enh['alla']['vintrar']
    veck_ = {}
    for f in sorted(glob.glob(os.path.join(a.samman, '**', 'veck_*.json'), recursive=True)):
        s = kedjan.las_json(f); veck_[s['vinter']] = s
    saknas = [v for v in vintrar + ['alla'] if v not in veck_]
    if saknas:
        raise SystemExit(f'samman: vecken {saknas} saknas')
    per = {v: veck_[v]['matt']['serier'] for v in vintrar}
    s = {'_om': 'Förregistreringen NY-KANDIDAT-2027-28 §3 (DECISIONS #670): de sex proven ihop. Bara aggregat.',
         'vintrar': vintrar, 'borttagna': enh['alla']['borttagna'],
         'par': {v: veck_[v]['par'] for v in vintrar + ['alla']},
         'per_vinter': {v: {'population': veck_[v]['matt']['population'], 'serier': per[v]} for v in vintrar},
         'medel': medel_over(per),
         'ur_summorna': matt.samman([dict(veck_[v], i_urvalet=False) for v in vintrar])}
    if a.frysta and '2022-23' in vintrar and os.path.exists(a.frysta):
        fr = kedjan.las_json(a.frysta)
        if fr.get('vinter') == '2022-23' and 'matt' in fr:
            s['jamforelse_2022_23'] = {'frysta': {'kandidat': fr.get('kandidat'), 'population': fr['matt']['population'], 'serier': fr['matt']['serier']},
                                       'nya': {'population': veck_['2022-23']['matt']['population'], 'serier': per['2022-23']}}
    os.makedirs(a.ut, exist_ok=True)
    k = kandidatfilen(enh, veck_['alla'])
    with open(os.path.join(a.ut, 'kandidat-2027-28.json'), 'w', encoding='utf-8') as fh: json.dump(k, fh, ensure_ascii=False, indent=1)
    with open(os.path.join(a.ut, 'samman.json'), 'w', encoding='utf-8') as fh: json.dump(s, fh, ensure_ascii=False, indent=1)
    with open(os.path.join(a.ut, 'samman.md'), 'w', encoding='utf-8') as fh: fh.write(markdown_samman(s, k))
    logg('samman: samman.json, samman.md och kandidat-2027-28.json')
    return 0


def markdown_samman(s, k):
    ut = [f"## Den nya kandidaten för 2027/28: de {len(s['vintrar'])} proven en vinter i taget utanför (förregistreringen NY-KANDIDAT-2027-28)", '']
    if s['borttagna']:
        ut += [f"Borttagna ur alla prov (§4): {json.dumps(s['borttagna'], ensure_ascii=False)}", '']
    ut += ['| Utelämnad vinter | paret | ' + ' | '.join(f'{n} A2' for n in matt.SERIER) + ' |', '| :-- | :-- |' + ' --: |' * len(matt.SERIER)]
    for v in s['vintrar']:
        se = s['per_vinter'][v]['serier']
        ut.append(f"| {v.replace('-', '/')} | W {str(s['par'][v]['W']).replace('.', ',')} · L {s['par'][v]['L_km']:g} km | "
                  + ' | '.join(matt.pct(se[n]['totalt']['A2']) for n in matt.SERIER) + ' |')
    ut += ['', '### Medel över vintrarna (det enkla medlet av vintrarnas tal)', '', '| | vintrar | A1 | A2 | A3 |', '| :-- | --: | --: | --: | --: |']
    for n in matt.SERIER:
        for cell, c in s['medel'][n].items():
            if cell in ('totalt', 'norr', 'soder') or cell.startswith('band'):
                ut.append(f"| {n} · {cell} | {c['vintrar']} | {matt.grad(c['A1'])} | {matt.pct(c['A2'])} | {matt.pct(c['A3'])} |")
    ut += [''] + matt.markdown_serier(s['ur_summorna']['serier'], 'Vintrarna tillsammans, ur summorna (som FLER-VINTRAR)')
    j = s.get('jamforelse_2022_23')
    if j:
        ut += ['', '### Jämförelsen med den frysta, bara 2022/23', '', '| | den frysta | den nya (2022/23 utanför) |', '| :-- | :-- | :-- |']
        for n in matt.SERIER:
            for cell in ('totalt', 'norr', 'soder'):
                ut.append(f"| {n} · {cell} | {matt.kort(j['frysta']['serier'][n][cell])} | {matt.kort(j['nya']['serier'][n][cell])} |")
    ut += ['', f"**Den slutliga kandidaten** (tränad på alla {len(s['vintrar'])} vintrar): paret W {str(k['par']['W']).replace('.', ',')} · "
               f"L {k['par']['L_km']:g} km. I urvalet (inte det väntade felet): "
               + (f"fysik + rättelse A1 {matt.grad(k['i_urvalet']['alla']['fysik_rattelse']['A1'])}, A2 {matt.pct(k['i_urvalet']['alla']['fysik_rattelse']['A2'])} "
                  f"på n {matt.tal(k['i_urvalet']['alla']['fysik_rattelse']['n'])}." if k.get('i_urvalet') else '—')]
    return '\n'.join(ut) + '\n'


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--veck'); ap.add_argument('--samman'); ap.add_argument('--enheter', nargs='+', required=True)
    ap.add_argument('--ph'); ap.add_argument('--vvis'); ap.add_argument('--indata'); ap.add_argument('--frysta')
    ap.add_argument('--plan', action='store_true', help='vecken för flödets matris, sedan varje skattning de läser finns')
    ap.add_argument('--behov', help='skattningarna (hinkens filnamn) som vecket läser, som JSON')
    ap.add_argument('--ut')
    a = ap.parse_args()
    if a.plan:
        print(json.dumps(plan(las_enheter(a.enheter)))); sys.exit(0)
    if a.behov:
        enh = las_enheter(a.enheter)
        print(json.dumps([f'{kedjan.HINKMAPP}/{f}' for f in behov(a.behov, enh['alla']['vintrar'])])); sys.exit(0)
    if not a.ut: ap.error('--ut krävs')
    if a.samman:
        sys.exit(samman(a))
    for k in ('veck', 'ph', 'vvis', 'indata'):
        if not getattr(a, k): ap.error(f'--{k} krävs')
    sys.exit(veck(a))
