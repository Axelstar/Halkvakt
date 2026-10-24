"""Förarnas vikter (DECISIONS #709): hur mycket trafik varje station i grind A representerar, för förarnas mått i utkastet till
FORREGISTRERING-2026-27 §4b punkt 13. Byggt före signeringen 26/10 2026, så att vikterna ligger i repot innan vinterns data läses.

Metoden:
  - VÄGLAGSPUNKTERNA är data/vagdata/vaglagspunkter.json: var 2 km längs väglagsnätet, med NVDB:s ÅDT (fordon per dygn), läst
    7/10 2026 (Trafikverket, CC0). Varje punkt bär trafikarbetet ÅDT × 2 km (fordonskilometer per dygn), som #490 räknade det. En
    punkt utan ÅDT bär 0 och räknas för sig.
  - STATIONERNA är grind A:s 754 (kuvos/kandidatstationer-2026-27.json) med positionerna ur data/vagdata/stationer.json.
  - VIKTEN för en station är summan av trafikarbetet för de punkter som ligger närmast den, med storcirkelavstånd (jordradien
    6371,0088 km). Vid exakt lika avstånd vinner stationen som kommer först i listan (sorterad på id:ets längd och sedan id:et).
  - REGELN I DOMEN: saknar en station mätningar i domens population tas den bort, och dess punkter går till närmaste station som finns
    kvar, med samma funktion (vikter() med de kvarvarande stationerna). Regeln beror bara på vilka stationer som har mätningar, inte
    på något fel.
  - KONTROLLSUMMORNA för de tre indatafilerna står i utfilen. --prova räknar om ur indatan och kräver att utfilen är exakt densamma.

  python fysik/vintrar/forarnas_vikter.py --rakna      # skriver kuvos/forarnas-vikter-2026-27.json
  python fysik/vintrar/forarnas_vikter.py --prova      # utfilen ska vara exakt det indatan ger (i ci)
  python fysik/vintrar/forarnas_vikter.py --sjalvtest
"""
import argparse, hashlib, json, math, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(HERE))
PUNKTER = 'data/vagdata/vaglagspunkter.json'
STATIONER = 'data/vagdata/stationer.json'
KANDIDATSTATIONER = 'kuvos/kandidatstationer-2026-27.json'
UT = 'kuvos/forarnas-vikter-2026-27.json'
R_KM = 6371.0088
KM_PER_PUNKT = 2.0
NORR_LAT = 62


def sha(fil):
    return hashlib.sha256(open(fil, 'rb').read()).hexdigest()


def ordning(ids):
    return sorted(ids, key=lambda s: (len(s), s))


def avstand_km(lon1, lat1, lon2, lat2):
    """Storcirkelavståndet (haversine) mellan punkter (n) och stationer (m) → (n × m)."""
    p1, p2 = np.radians(lat1)[:, None], np.radians(lat2)[None, :]
    dl = np.radians(lon2)[None, :] - np.radians(lon1)[:, None]
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return 2 * R_KM * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def vikter(punkter, stationer, ids):
    """punkter: [{lon, lat, adt_fordon}]; stationer: {id: {lon, lat}}; ids: grind A:s stationer. → ({id: vikt}, summering)."""
    ids = ordning(ids)
    slon = np.array([stationer[i]['lon'] for i in ids], float); slat = np.array([stationer[i]['lat'] for i in ids], float)
    plon = np.array([p['lon'] for p in punkter], float); plat = np.array([p['lat'] for p in punkter], float)
    adt = np.array([(p.get('adt_fordon') if isinstance(p.get('adt_fordon'), (int, float)) else np.nan) for p in punkter], float)
    tr = np.where(np.isfinite(adt), adt * KM_PER_PUNKT, 0.0)
    narmast = np.empty(len(punkter), int); dist = np.empty(len(punkter))
    for a in range(0, len(punkter), 2000):                         # i bitar, så att matrisen ryms
        D = avstand_km(plon[a:a + 2000], plat[a:a + 2000], slon, slat)
        narmast[a:a + 2000] = np.argmin(D, axis=1)                 # vid lika: första i ordningen
        dist[a:a + 2000] = D[np.arange(D.shape[0]), narmast[a:a + 2000]]
    w = np.zeros(len(ids)); np.add.at(w, narmast, tr)
    v = {i: int(round(x)) for i, x in zip(ids, w)}
    norr = slat >= NORR_LAT
    tot = float(tr.sum())
    s = {'punkter': len(punkter), 'med_adt': int(np.isfinite(adt).sum()), 'utan_adt': int((~np.isfinite(adt)).sum()),
         'trafikarbete_fordonskm_per_dygn': int(round(tot)), 'stationer': len(ids), 'stationer_med_vikt': int((w > 0).sum()),
         'stationer_utan_vikt': int((w == 0).sum()), 'avstand_km': {'median': round(float(np.median(dist)), 2),
                                                                 'p95': round(float(np.quantile(dist, 0.95)), 2), 'max': round(float(dist.max()), 2)},
         'andel_norr': round(float(w[norr].sum() / tot), 4) if tot else None,
         'storsta_station_andel': round(float(w.max() / tot), 4) if tot else None}
    return v, s


def las_indata(rot=ROT):
    j = lambda f: json.load(open(os.path.join(rot, f), encoding='utf-8'))
    punkter = j(PUNKTER)['rader']
    stationer = {r['id']: r for r in j(STATIONER)['rader']}
    ids = j(KANDIDATSTATIONER)['stationer']
    saknas = [i for i in ids if i not in stationer]
    if saknas:
        raise SystemExit(f'{len(saknas)} av grind A:s stationer saknar position i {STATIONER}: {saknas[:5]}')
    return punkter, stationer, ids


def bygg(rot=ROT):
    punkter, stationer, ids = las_indata(rot)
    v, s = vikter(punkter, stationer, ids)
    return {'_om': ('Förarnas vikter (DECISIONS #709): trafikarbetet (ÅDT × 2 km, fordonskilometer per dygn) för väglagspunkterna närmast '
                    'varje station i grind A, för förarnas mått i utkastet till FORREGISTRERING-2026-27 §4b punkt 13. Gäller bara om den '
                    'punkten signeras. Saknar en station mätningar i domens population går dess punkter till närmaste kvarvarande station '
                    '(fysik/vintrar/forarnas_vikter.py vikter()). Byggd före signeringen.'),
            'beslut': '#709',
            'indata': {f: {'sha256': sha(os.path.join(rot, f))} for f in (PUNKTER, STATIONER, KANDIDATSTATIONER)},
            'metod': {'trafikarbete': 'ÅDT (adt_fordon) × 2 km per väglagspunkt; utan ÅDT 0', 'tilldelning': 'närmaste station, storcirkel, '
                      f'R {R_KM} km; vid lika den första i ordningen (id:ets längd, sedan id:et)', 'enhet': 'fordonskilometer per dygn'},
            'summering': s, 'vikter': v}


def text(d):
    return json.dumps(d, ensure_ascii=False, indent=1) + '\n'


def sjalvtest():
    import tempfile
    fel = []
    def k(ok, msg):
        print(('  ok   ' if ok else '  FEL  ') + msg)
        if not ok: fel.append(msg)
    st = {'1': {'lon': 15.0, 'lat': 60.0}, '2': {'lon': 16.0, 'lat': 60.0}, '10': {'lon': 15.0, 'lat': 63.0}}
    p = [{'lon': 15.1, 'lat': 60.0, 'adt_fordon': 1000}, {'lon': 15.9, 'lat': 60.0, 'adt_fordon': 500},
         {'lon': 15.0, 'lat': 62.9, 'adt_fordon': 200}, {'lon': 15.0, 'lat': 60.1, 'adt_fordon': None},
         {'lon': 15.5, 'lat': 60.0, 'adt_fordon': 300}]                       # mitt emellan 1 och 2: lika långt
    v, s = vikter(p, st, ['1', '2', '10'])
    k(v == {'1': 2000 + 600, '2': 1000, '10': 400}, f'närmaste station, ÅDT × 2 km, och vid lika den första i ordningen: {v}')
    k(s['utan_adt'] == 1 and s['med_adt'] == 4 and s['trafikarbete_fordonskm_per_dygn'] == 4000, f"utan ÅDT bär 0 och räknas: {s}")
    k(abs(s['andel_norr'] - 400 / 4000) < 1e-9 and s['stationer_utan_vikt'] == 0, 'andelen norr om 62°')
    v2, _ = vikter(p, st, ['2', '10'])
    k(v2 == {'2': 3600, '10': 400}, f'regeln i domen: en station utan mätningar tas bort och dess punkter går till närmaste kvarvarande: {v2}')
    k(vikter(p, st, ['10', '2', '1'])[0] == v, 'ordningen i listan spelar ingen roll')
    d = avstand_km(np.array([15.0]), np.array([60.0]), np.array([16.0]), np.array([60.0]))[0, 0]
    k(abs(d - 55.6) < 0.3, f'storcirkelavståndet 1° longitud vid 60° N ≈ 55,6 km: {d:.2f}')
    with tempfile.TemporaryDirectory() as rot:                               # bygg och prova mot en påhittad rot
        os.makedirs(os.path.join(rot, 'data', 'vagdata')); os.makedirs(os.path.join(rot, 'kuvos'))
        json.dump({'rader': p}, open(os.path.join(rot, PUNKTER), 'w', encoding='utf-8'))
        json.dump({'rader': [{'id': i, **x} for i, x in st.items()]}, open(os.path.join(rot, STATIONER), 'w', encoding='utf-8'))
        json.dump({'stationer': ['1', '2', '10']}, open(os.path.join(rot, KANDIDATSTATIONER), 'w', encoding='utf-8'))
        b = bygg(rot)
        k(b['vikter'] == v and set(b['indata']) == {PUNKTER, STATIONER, KANDIDATSTATIONER}, 'bygg(): vikterna och indatans summor')
        k(text(bygg(rot)) == text(b), 'samma indata ger byte för byte samma fil')
        json.dump({'stationer': ['1', '2', '10', '99']}, open(os.path.join(rot, KANDIDATSTATIONER), 'w', encoding='utf-8'))
        try:
            bygg(rot); k(False, 'en station utan position lästes')
        except SystemExit as e:
            k('saknar position' in str(e), f'en station utan position fälls: {e}')
    print(('✓ självtest' if not fel else f'✗ självtest: {len(fel)} fel') + ': närmaste station, trafikarbetet, utan ÅDT, andelen norr, '
          'regeln i domen, ordningen, avståndet, byggets summor och att samma indata ger samma fil')
    return 1 if fel else 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--rakna', action='store_true'); ap.add_argument('--prova', action='store_true'); ap.add_argument('--sjalvtest', action='store_true')
    a = ap.parse_args()
    if a.sjalvtest:
        sys.exit(sjalvtest())
    if a.rakna:
        d = bygg(); open(os.path.join(ROT, UT), 'w', encoding='utf-8', newline='\n').write(text(d))
        print(f"{UT}: {d['summering']}"); sys.exit(0)
    if a.prova:
        ut = os.path.join(ROT, UT)
        if open(ut, encoding='utf-8').read() != text(bygg()):
            sys.exit(f'{UT} är inte det indatan ger — räkna om med --rakna, eller ta reda på vilken indatafil som ändrats')
        print(f'✓ {UT}: exakt det indatan ger ({json.load(open(ut, encoding="utf-8"))["summering"]["stationer_med_vikt"]} stationer med vikt)')
        sys.exit(0)
    ap.print_help()
