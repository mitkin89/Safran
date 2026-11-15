# Seitenregister für Graetz, Geschichte der Juden: (Band, Seite) -> Abschnitt:Absatz im mitgelieferten Text, dazu die Noten je Band.
# Grundlage sind die Seitenmarken <small>[Band, Seite]</small> (zeno.org setzt sie ans ENDE einer Seite; steht am Anfang eines
# Abschnitts eine Marke, auf die gleich noch einmal dieselbe Seitenzahl folgt, ist sie nur die Angabe der Anfangsseite).
# Ausgabe: graetz-pages.js (window.GraetzPages bzw. module.exports), gebraucht von autoref.js für Zitate wie „GRAETZ, Gesch. 4³ 172“.
# Aufruf: python3 tools/graetz/pages.py
import json, glob, os, re, collections
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
f = glob.glob(os.path.join(ROOT, 'bundled/own/Graetz, Geschichte der Juden/de/*.json'))[0]
T = json.load(open(f, encoding='utf-8'))['text']
OUT = json.load(open(os.path.join(ROOT, 'outlines', 'Graetz_ Geschichte der Juden.json'), encoding='utf-8'))
MK = re.compile(r'<small>\[([IVX]+(?:/\d)?), (\d+)\]</small>')

first = {}  # (Band, Seite) -> (Abschnitt, Absatz), beide ab 1
secvol = {}
def put(v, p, s, a):
    if (v, p) not in first: first[(v, p)] = (s, a)
for s, sec in enumerate(T, 1):
    ms = [(i, m.start(), m.end(), m.group(1), int(m.group(2))) for i, para in enumerate(sec) for m in MK.finditer(para)]
    if not ms: continue
    secvol[s] = ms[0][3]
    lead = len(ms) > 1 and ms[0][4] == ms[1][4] and ms[0][1] == 0
    v0, p0 = ms[0][3], ms[0][4]
    put(v0, p0, s, 1)  # der Abschnitt beginnt auf der Seite seiner ersten Marke
    for (i, st, en, v, p) in (ms[1:] if lead else ms):
        # Marke = Seitenende von p: Seite p+1 beginnt dahinter (am Absatzende: im nächsten Absatz)
        rest = re.sub(r'<[^>]+>|\s', '', sec[i][en:])
        a = i + 2 if not rest and i + 1 < len(sec) else i + 1
        put(v, p + 1, s, a)

vols = collections.OrderedDict()
for (v, p), sa in sorted(first.items(), key=lambda x: (x[1], x[0][1])):
    vols.setdefault(v, {})[p] = sa
data = {}
for v, pages in vols.items():
    lo, hi = min(pages), max(pages)
    arr, last = [], None
    for p in range(lo, hi + 1):
        if p in pages: last = pages[p]
        arr.append('%d:%d' % last if last else '')
    data[v] = {'from': lo, 'refs': ' '.join(arr)}

# Noten: „Noten“ im Gliederungskopf, Nummer am Anfang des Eintrags oder des letzten Kopfteils
notes = collections.defaultdict(dict)
for h in OUT['sections']:
    head = h['head']
    if 'Noten' not in head.split(' · '): continue
    tail = head.split(' · ')[head.split(' · ').index('Noten') + 1:]
    for it in h['items']:
        s = int(it['ref'].split(':')[0]); v = secvol.get(s)
        if not v: continue
        lab = tail[0] if tail else it['text']
        m = re.match(r'(\d+)\.', lab)
        if m and m.group(1) not in notes[v]: notes[v][m.group(1)] = s
js = ('// erzeugt von tools/graetz/pages.py – Seitenregister zu Graetz, Geschichte der Juden (Text nach zeno.org)\n'
      '// refs: je Seite ab „from“ die Stelle „Abschnitt:Absatz“; notes: Band -> Nummer der Note -> Abschnitt\n'
      '(function () { const D = ' + json.dumps({'title': 'Graetz, Geschichte der Juden', 'vols': data, 'notes': notes}, ensure_ascii=False, separators=(',', ':')) + ';\n'
      "if (typeof module !== 'undefined' && module.exports) module.exports = D; else window.GraetzPages = D; })();\n")
open(os.path.join(ROOT, 'graetz-pages.js'), 'w', encoding='utf-8').write(js)
print('Bände', {v: (d['from'], d['from'] + len(d['refs'].split(' ')) - 1) for v, d in data.items()}, 'Noten', {v: len(n) for v, n in notes.items()}, 'Bytes', len(js.encode()))
