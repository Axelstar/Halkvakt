"""Småvägsprovets populationer, spärr och läckageprov (förregistreringen FORREGISTRERING-SMAVAGAR-2027-28, signerad 31/10, DECISIONS
#767; kort #367).

Populationerna räknas ur filerna och fryses i data/vagdata/smavagar-populationer.json, så att proven håller ute exakt de stationer
förregistreringen räknade (§2), och populationsprovet (§8 c) jämför filen med en ny räkning och med talen i §2:
  - P1: statliga stationer (Vagha-fältet i data/vagdata/stationer.json, inte kommunal) mer än 2 km från varje väglagspunkt;
  - P3: stationer på kommunal väg;
  - storstäderna: alla stationer inom 15 km från Stockholms, Göteborgs och Malmös centrum;
  - P2 (bara fukten F2): stationer under 1 000 fordon/dygn inom 2 km från en väglagspunkt.
Fjärrytorna (id <nr>100) slås ihop med sin station. P1, P3 och P2 räknas bland grind A:s stationer (kuvos/kandidatstationer-2026-27.json);
storstäderna redovisas också utanför grind A. De utelämnade i proven (§3) är P1, P3 och storstäderna inom grind A.

  python fysik/ny_kandidat/smavagar.py skriv        räknar och skriver data/vagdata/smavagar-populationer.json
  python fysik/ny_kandidat/smavagar.py --check      populationsprovet: filen är aktuell och talen är §2:s
  python fysik/ny_kandidat/smavagar.py --sparren    spärren: förregistreringen är signerad (utgångskod 2 annars)
  python fysik/ny_kandidat/smavagar.py --sjalvtest  standardbiblioteket; körs i ci.yml

Läckageprovet (§8 d) är lackage(): inget id bland de utelämnade får finnas bland träningens, parvalets eller grannarnas stationer.
Bara standardbiblioteket, så att filen går att köra före numpy och var som helst.
"""
import hashlib, json, math, os, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import sparren

FORREG = os.path.join(ROT, 'docs', 'FORREGISTRERING-SMAVAGAR-2027-28.md')
UT = os.path.join(ROT, 'data', 'vagdata', 'smavagar-populationer.json')
KALLOR = {'stationer': 'data/vagdata/stationer.json', 'vaglagspunkter': 'data/vagdata/vaglagspunkter.json',
          'grind_a': 'kuvos/kandidatstationer-2026-27.json'}
NATET_KM = 2.0
STAD_KM = 15.0
STADER = {'Stockholm': (59.3293, 18.0686), 'Göteborg': (57.7089, 11.9746), 'Malmö': (55.6050, 13.0038)}   # §2
ADT_GRANS = 1000
# §2:s tal, räknade 31/10 före signeringen; populationsprovet fäller en räkning som inte ger dem.
PARAGRAF2 = {'P1': 79, 'P1_grind_a': 77, 'P3': 10, 'P3_grind_a': 10, 'P2_grind_a': 95,
             'Stockholm': 11, 'Göteborg': 9, 'Malmö': 3}


def km(lon1, lat1, lon2, lat2):
    """Samma avstånd som räkningarna 31/10 (#758, #761, #762): ekvirektangulärt på jordradien 6 371 km."""
    x = math.radians(lon2 - lon1) * math.cos(math.radians((lat1 + lat2) / 2))
    y = math.radians(lat2 - lat1)
    return 6371 * math.hypot(x, y)


def fjarryta(sid):
    return len(sid) > 4 and sid.endswith('100')


def las(rot=ROT):
    def j(p):
        with open(os.path.join(rot, p), encoding='utf-8') as fh:
            return json.load(fh)
    st = j(KALLOR['stationer'])['rader']
    vp = j(KALLOR['vaglagspunkter'])['rader']
    ga = j(KALLOR['grind_a'])
    ga = ga['stationer'] if isinstance(ga, dict) else ga
    grind_a = {str(x.get('id', x.get('station')) if isinstance(x, dict) else x) for x in ga}
    return st, vp, grind_a


def populationer(st, vp, grind_a):
    """→ {namn: sorterade id}. Se modulens docstring för reglerna."""
    huv = [r for r in st if not fjarryta(str(r['id']))]
    rutor = {}
    for p in vp:                                  # väglagspunkterna i rutor om ~0,05°, för närmaste-avståndet
        rutor.setdefault((int(p['lat'] * 20), int(p['lon'] * 20)), []).append((p['lon'], p['lat']))

    def till_natet(r):
        """Närmaste väglagspunkt i rutorna runt stationen (minst ~5 km åt varje håll). Längre bort ger inf: frågan är bara > 2 km."""
        best = math.inf
        ri, rj = int(r['lat'] * 20), int(r['lon'] * 20)
        for di in (-1, 0, 1):
            for dj in range(-2, 3):
                for lon, lat in rutor.get((ri + di, rj + dj), ()):
                    best = min(best, km(r['lon'], r['lat'], lon, lat))
        return best
    p = {}
    ute = [r for r in huv if till_natet(r) > NATET_KM]
    p['P1'] = sorted(str(r['id']) for r in ute if r.get('vaghallare') != 'kommunal')
    p['P3'] = sorted(str(r['id']) for r in huv if r.get('vaghallare') == 'kommunal')
    adt = lambda r: r.get('adt_fordon') if r.get('adt_fordon') is not None else math.inf
    p['P2'] = sorted(str(r['id']) for r in huv if adt(r) < ADT_GRANS and till_natet(r) <= NATET_KM)
    for stad, (lat, lon) in STADER.items():
        p[stad] = sorted(str(r['id']) for r in huv if km(r['lon'], r['lat'], lon, lat) <= STAD_KM)
    for k in list(p):
        p[f'{k}_grind_a'] = [s for s in p[k] if s in grind_a]
    p['utelamnade'] = sorted(set(p['P1_grind_a']) | set(p['P3_grind_a'])
                             | {s for stad in STADER for s in p[f'{stad}_grind_a']})
    return p


def tal(p):
    return {'P1': len(p['P1']), 'P1_grind_a': len(p['P1_grind_a']), 'P3': len(p['P3']), 'P3_grind_a': len(p['P3_grind_a']),
            'P2_grind_a': len(p['P2_grind_a']), **{stad: len(p[stad]) for stad in STADER}}


def summa(fil):
    with open(fil, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def innehall(rot=ROT):
    st, vp, ga = las(rot)
    p = populationer(st, vp, ga)
    huvud = {'kalla': 'Räknat ur ' + ', '.join(KALLOR.values()) + ' med fysik/ny_kandidat/smavagar.py (FORREGISTRERING-SMAVAGAR-2027-28 §2, '
                      'DECISIONS #767, #768)',
             'regler': {'natet_km': NATET_KM, 'stad_km': STAD_KM, 'stader': STADER, 'adt_grans': ADT_GRANS,
                        'fjarrytor': 'id <nr>100 slås ihop med sin station'},
             'summor': {k: summa(os.path.join(rot, v)) for k, v in KALLOR.items()}, 'tal': tal(p)}
    return {'huvud': huvud, 'populationer': p}


def skriv(ut=UT, rot=ROT):
    s = innehall(rot)
    tmp = f'{ut}.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(s, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    os.replace(tmp, ut)
    return s


def prova(ut=UT, rot=ROT, paragraf2=PARAGRAF2):
    """Populationsprovet (§8 c). → lista med fel; tom = klarat."""
    fel = []
    ny = innehall(rot)
    if ny['huvud']['tal'] != paragraf2:
        fel.append(f"räkningen ger {ny['huvud']['tal']}, förregistreringens §2 säger {paragraf2}")
    try:
        with open(ut, encoding='utf-8') as fh:
            gammal = json.load(fh)
    except OSError:
        return fel + [f'{os.path.relpath(ut, rot)} saknas — kör skriv']
    if gammal != json.loads(json.dumps(ny, ensure_ascii=False)):
        fel.append(f'{os.path.relpath(ut, rot)} är inte aktuell mot källfilerna — kör skriv, och läs varför de ändrats')
    return fel


def lackage(utelamnade, **stationer):
    """Läckageprovet (§8 d): stationer={'traning': [...], 'parval': [...], 'grannar': [...]}. Kastar om ett utelämnat id finns i någon."""
    u = set(map(str, utelamnade))
    fel = {k: sorted(u & set(map(str, v))) for k, v in stationer.items()}
    fel = {k: v for k, v in fel.items() if v}
    if fel:
        raise SystemExit(f'läckageprovet (§8 d): utelämnade stationer finns i {fel}')
    return True


def vagra_osignerad(fil=None):
    """Spärren: småvägsförregistreringen ska vara signerad (sparren.py:s regel) innan något utfall läses."""
    return sparren.vagra_osignerad(fil or FORREG)


def sjalvtest():
    fel = []
    st = [{'id': '1201', 'lon': 15.0, 'lat': 60.0, 'vaghallare': 'statlig', 'adt_fordon': 500},       # på nätet, låg trafik ⇒ P2
          {'id': '1202', 'lon': 15.2, 'lat': 60.0, 'vaghallare': 'statlig', 'adt_fordon': 300},       # 11 km bort ⇒ P1
          {'id': '1202100', 'lon': 15.2, 'lat': 60.0, 'vaghallare': 'statlig', 'adt_fordon': 300},    # fjärryta, slås ihop
          {'id': '7102', 'lon': 18.07, 'lat': 59.33, 'vaghallare': 'kommunal', 'adt_fordon': None},   # P3 och Stockholm
          {'id': '1204', 'lon': 15.3, 'lat': 60.0, 'vaghallare': 'statlig', 'adt_fordon': 300}]       # P1 men inte i grind A
    vp = [{'lon': 15.0, 'lat': 60.0}, {'lon': 18.07, 'lat': 59.33}]
    p = populationer(st, vp, {'1201', '1202', '7102'})
    if p['P1'] != ['1202', '1204'] or p['P1_grind_a'] != ['1202']: fel.append(f"P1: {p['P1']}, {p['P1_grind_a']}")
    if p['P3'] != ['7102'] or p['Stockholm'] != ['7102'] or p['Göteborg'] != []: fel.append(f"P3 och städerna: {p['P3']}, {p['Stockholm']}")
    if p['P2'] != ['1201']: fel.append(f"P2: {p['P2']}")
    if p['utelamnade'] != ['1202', '7102']: fel.append(f"de utelämnade: {p['utelamnade']}")
    if abs(km(15.0, 60.0, 15.2, 60.0) - 11.12) > 0.05: fel.append(f'avståndet: {km(15.0, 60.0, 15.2, 60.0)}')
    try:
        lackage(['1202', '7102'], traning=['1201', '1204'], parval=['1201'], grannar=['1201', '1204']); ok = True
    except SystemExit:
        ok = False
    if not ok: fel.append('läckageprovet släpper igenom rena listor')
    try:
        lackage(['1202', '7102'], traning=['1201', '1202']); fel.append('läckageprovet fäller en utelämnad i träningen')
    except SystemExit as e:
        if "'traning': ['1202']" not in str(e): fel.append(f'läckageprovet säger var: {e}')
    with tempfile.TemporaryDirectory() as d:
        for k, v in KALLOR.items():
            os.makedirs(os.path.dirname(os.path.join(d, v)), exist_ok=True)
        json.dump({'rader': st}, open(os.path.join(d, KALLOR['stationer']), 'w', encoding='utf-8'))
        json.dump({'rader': vp}, open(os.path.join(d, KALLOR['vaglagspunkter']), 'w', encoding='utf-8'))
        json.dump({'stationer': ['1201', '1202', '7102']}, open(os.path.join(d, KALLOR['grind_a']), 'w', encoding='utf-8'))
        ut = os.path.join(d, 'pop.json')
        skriv(ut, d)
        p2 = tal(innehall(d)['populationer'])
        if prova(ut, d, p2): fel.append(f'en färsk fil klarar provet: {prova(ut, d, p2)}')
        if not any('§2 säger' in f for f in prova(ut, d, dict(p2, P1=99))): fel.append('provet fäller fel tal mot §2')
        with open(os.path.join(d, KALLOR['vaglagspunkter']), 'w', encoding='utf-8') as fh:
            json.dump({'rader': vp[:1]}, fh)
        if not any('inte aktuell' in f for f in prova(ut, d, tal(innehall(d)['populationer']))): fel.append('provet fäller en inaktuell fil')
        osig = os.path.join(d, 'f.md')
        with open(osig, 'w', encoding='utf-8') as fh:
            fh.write('**Status: UTKAST**\n| Bengt | | |\n| Axel | | |\n')
        try:
            vagra_osignerad(osig); fel.append('spärren vägrar en osignerad förregistrering')
        except SystemExit as e:
            if e.code != 2: fel.append(f'spärrens utgångskod: {e.code}')
    for f in fel: print('✗', f)
    if fel: sys.exit(1)
    print('✓ självtest: P1, P2, P3 och storstäderna räknas med fjärrytorna ihop och grind A:s urval, läckageprovet fäller en '
          'utelämnad station och säger var, populationsprovet fäller fel tal och en inaktuell fil, och spärren vägrar utan signaturer')


if __name__ == '__main__':
    if '--sjalvtest' in sys.argv:
        sjalvtest(); sys.exit(0)
    if '--sparren' in sys.argv:
        vagra_osignerad()
        print('spärren: småvägsförregistreringen är signerad'); sys.exit(0)
    if '--check' in sys.argv:
        fel = prova()
        for f in fel: print('✗', f)
        if fel: sys.exit(1)
        t = innehall()['huvud']['tal']
        print(f"✓ populationsprovet (§8 c): {os.path.relpath(UT, ROT)} är aktuell och talen är §2:s: {json.dumps(t, ensure_ascii=False)}")
        sys.exit(0)
    if len(sys.argv) > 1 and sys.argv[1] == 'skriv':
        s = skriv()
        print(f"{os.path.relpath(UT, ROT)}: {json.dumps(s['huvud']['tal'], ensure_ascii=False)}; utelämnade i proven: "
              f"{len(s['populationer']['utelamnade'])}")
        sys.exit(0)
    print(__doc__); sys.exit(1)
