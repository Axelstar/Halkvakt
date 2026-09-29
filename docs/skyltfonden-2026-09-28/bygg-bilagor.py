# Bygger Skyltfondsansökans bilagor 2–8 som PDF ur markdown (DECISIONS #394).
# Kör från repots rot:  pip install --target pylib markdown-it-py mdit-py-plugins
#                       PYLIB=pylib python3 docs/skyltfonden-2026-09-28/bygg-bilagor.py
# Bilaga 3, 7 och 8 byggs ur SYSTEM.md, TROSKLAR-SKUGGAN.md och ANMALAN-TRV-*.md som de står i repot.
import sys, re, subprocess, os, pathlib
import os
sys.path.insert(0, os.environ.get('PYLIB', 'pylib'))
from markdown_it import MarkdownIt
from mdit_py_plugins.deflist import deflist_plugin
MD = MarkdownIt('commonmark', {'html': True}).enable('table').use(deflist_plugin)
ROOT = pathlib.Path('/home/user/Halkvakt')
OUT = ROOT / 'docs/skyltfonden-2026-09-28'
CHROME = os.environ.get('CHROME', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
CSS = """
@page { size: A4; margin: 20mm 18mm 20mm 18mm; }
body { font-family: 'DejaVu Sans', 'Liberation Sans', Arial, sans-serif; font-size: 10pt; line-height: 1.45; color: #111; }
h1 { font-size: 16pt; margin: 0 0 8pt; border-bottom: 1.5pt solid #333; padding-bottom: 4pt; }
h2 { font-size: 12.5pt; margin: 16pt 0 6pt; }
h3 { font-size: 11pt; margin: 12pt 0 4pt; }
p { margin: 0 0 7pt; }
ul, ol { margin: 0 0 7pt 0; padding-left: 16pt; }
li { margin-bottom: 2pt; }
table { border-collapse: collapse; width: 100%; margin: 6pt 0 10pt; font-size: 8.8pt; page-break-inside: auto; }
th, td { border: 0.6pt solid #999; padding: 3pt 5pt; vertical-align: top; text-align: left; }
th { background: #eee; }
tr { page-break-inside: avoid; }
code { font-family: 'DejaVu Sans Mono', monospace; font-size: 8.5pt; background: #f2f2f2; padding: 0 2pt; }
hr { border: 0; border-top: 0.8pt solid #bbb; margin: 12pt 0; }
dl dt { font-weight: normal; margin-top: 8pt; }
dl dd { margin: 2pt 0 0 14pt; color: #333; }
blockquote { margin: 6pt 0 6pt 10pt; padding-left: 8pt; border-left: 2pt solid #bbb; color: #333; }
.shots { display: flex; flex-wrap: wrap; gap: 10pt; margin: 8pt 0 12pt; }
.shots figure { width: 30%; margin: 0; page-break-inside: avoid; }
.shots img { width: 100%; border: 0.6pt solid #888; border-radius: 6pt; }
.shots figcaption { font-size: 8.3pt; margin-top: 3pt; line-height: 1.3; }
.sidfot { font-size: 8pt; color: #666; margin-top: 14pt; }
"""

LIST = re.compile(r'^\s*([-*+]|\d+\.)\s')
LABEL = re.compile(r'^\*\*[^*]+:\*\*')
def prep(t):
    out = []
    lines = t.split('\n')
    for i, ln in enumerate(lines):
        prev = out[-1] if out else ''
        if LIST.match(ln) and prev.strip() and not LIST.match(prev) and not prev.startswith(('  ', '|', '#')):
            out.append('')
        if LABEL.match(ln) and prev.strip() and not LIST.match(prev) and not prev.startswith(('#', '|')):
            out[-1] = prev.rstrip() + '  '
        out.append(ln)
    return '\n'.join(out)
def md2html(text):
    out = []
    for ln in text.split('\n'):
        if LABEL.match(ln) and out and out[-1].strip() and not LIST.match(out[-1]) and not out[-1].startswith(('#', '|')):
            out[-1] = out[-1].rstrip() + '  '
        out.append(ln)
    return MD.render('\n'.join(out))
def read(p): return (ROOT / p).read_text(encoding='utf-8')
def strip_footer(t):
    # drop the trailing internal "*Underlag: ...*" paragraph
    return re.sub(r'\n---\n\n\*Underlag:.*\Z', '\n', t, flags=re.S)
def shift(t):
    # demote headings of an appended source doc one level so the cover's h1 stays the only h1
    return re.sub(r'^(#{1,5}) ', lambda m: '#' + m.group(1) + ' ', t, flags=re.M)
bilagor = {
  'bilaga-2-rekrytering': read('docs/skyltfonden-2026-09-28/bilaga-2-rekrytering.md'),
  'bilaga-3-systembeskrivning': read('docs/skyltfonden-2026-09-28/bilaga-3-omslag.md') + '\n\n---\n\n' + shift(read('docs/SYSTEM.md')),
  'bilaga-4-litteratur': read('docs/skyltfonden-2026-09-28/bilaga-4-litteratur.md'),
  'bilaga-5-kallor': read('docs/skyltfonden-2026-09-28/bilaga-5-kallor.md'),
  'bilaga-6-appen': read('docs/skyltfonden-2026-09-28/bilaga-6-appen.md'),
  'bilaga-7-troskeldokument': read('docs/skyltfonden-2026-09-28/bilaga-7-omslag.md') + '\n\n' + shift(re.sub(r'yttemp\n> \+2', 'yttemp > +2', read('docs/TROSKLAR-SKUGGAN.md'))),
  'bilaga-8-anmalningar': read('docs/skyltfonden-2026-09-28/bilaga-8-omslag.md') + '\n\n' +
      shift(strip_footer(read('docs/ANMALAN-TRV-YTGIVARE.md'))) + '\n\n---\n\n' + shift(strip_footer(read('docs/ANMALAN-TRV-BYVINDGIVARE.md'))),
}
for k in list(bilagor):
    bilagor[k] = bilagor[k].replace('[kontaktuppgifter fylls i före utskick]', 'Bengt Lagerlöf')
pdfs = []
for name, text in bilagor.items():
    html = f"<!doctype html><html lang='sv'><head><meta charset='utf-8'><title>{name}</title><style>{CSS}</style></head><body>{md2html(text)}<p class='sidfot'>Halkvakt — ansökan till Skyltfonden 2026 · {name.replace('-', ' ', 1).split('-')[0].capitalize()}</p></body></html>"
    hp = OUT / f'.{name}.html'
    hp.write_text(html, encoding='utf-8')
    pdf = OUT / f'{name}.pdf'
    r = subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu', '--allow-file-access-from-files',
                        '--no-pdf-header-footer', f'--print-to-pdf={pdf}', f'file://{hp}'], capture_output=True, text=True, timeout=120)
    if not pdf.exists():
        print('FAIL', name, r.stderr[-500:]); sys.exit(1)
    n = len(re.findall(rb'/Type\s*/Page[^s]', pdf.read_bytes()))
    print(f'{name}.pdf  {pdf.stat().st_size//1024} KB  {n} s')
    pdfs.append(pdf)
    hp.unlink()
