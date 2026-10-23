"""Spärren för den nya kandidaten (förregistreringen NY-KANDIDAT-2027-28, DECISIONS #670): inget utfall för en utelämnad vinter
skrivs ut förrän förregistreringen är signerad.

Som kuvos/facit-trv.ts vägrar utan signaturerna (signerad() där, DECISIONS #591) vägrar prövningen här, men med två villkor som båda
ska hålla: statusraden börjar med `**Status: SIGNERAD`, och signaturtabellen (§9) har datum och signatur på både Bengts och Axels rad.
Spärren prövas i provning.py innan något läses (varje läge som räknar ett utfall anropar vagra_osignerad()), och i flödet som första
steg (--sparren, utgångskod 2). Bara standardbiblioteket, så att den går att köra före allt annat.

  python fysik/ny_kandidat/sparren.py [<förregistreringen>]        utgångskod 0 = signerad, 2 = vägrar
"""
import os, re, sys

ROT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FORREG = os.path.join(ROT, 'docs', 'FORREGISTRERING-NY-KANDIDAT-2027-28.md')
STATUS = re.compile(r'^\*\*Status: SIGNERAD\b', re.M)


def signaturen(text, namn):
    """facit-trv.ts signerad(): raden | namn | datum | signatur | med både datum och signatur ifyllda."""
    m = re.search(rf'^\|\s*{namn}\s*\|([^|]*)\|([^|]*)\|', text, re.M)
    return bool(m and m[1].strip() and m[2].strip())


def lage(text):
    """Statusraden och de två signaturerna, var för sig."""
    return {'status_signerad': bool(STATUS.search(text)), 'bengt': signaturen(text, 'Bengt'), 'axel': signaturen(text, 'Axel')}


def signerad(text):
    s = lage(text)
    return s['status_signerad'] and s['bengt'] and s['axel']


def vagra_osignerad(fil=None):
    """Kastar SystemExit(2) om förregistreringen inte är signerad. Returnerar läget när den är det.

    Utan fil läses repots förregistrering. Självtestet pekar ut en påhittad med miljövariabeln NYKAND_FORREG_SJALVTEST, så att
    spärren kan prövas oberoende av om repots förregistrering är signerad; flödet sätter aldrig variabeln."""
    fil = fil or os.environ.get('NYKAND_FORREG_SJALVTEST') or FORREG
    try:
        text = open(fil, encoding='utf-8').read()
    except OSError as e:
        print(f'vägrar: förregistreringen {fil} går inte att läsa ({e})', file=sys.stderr)
        raise SystemExit(2)
    s = lage(text)
    if not (s['status_signerad'] and s['bengt'] and s['axel']):
        print(f"vägrar: förregistreringen {os.path.basename(fil)} är inte signerad (statusraden **Status: SIGNERAD "
              f"{'finns' if s['status_signerad'] else 'saknas'}, Bengt {'signerat' if s['bengt'] else 'INTE signerat'}, "
              f"Axel {'signerat' if s['axel'] else 'INTE signerat'}) — inget utfall för en utelämnad vinter skrivs ut (DECISIONS #670)",
              file=sys.stderr)
        raise SystemExit(2)
    return s


if __name__ == '__main__':
    fil = sys.argv[1] if len(sys.argv) > 1 else (os.environ.get('NYKAND_FORREG_SJALVTEST') or FORREG)
    vagra_osignerad(fil)
    print(f'förregistreringen {os.path.basename(fil)}: signerad (statusraden och båda signaturerna)')
