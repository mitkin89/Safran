#!/usr/bin/env python3
"""ETCBC Parallels (MIT) + BHSA 2021 -> parallels.js (Vers-Parallelen, Ähnlichkeit 75-100 %).
Aufruf: python3 -I parallels.py <parallels-Ordner> <bhsa-Ordner> <tfload.py-Ordner> <Safran-Projektordner>"""
import sys, json, os, collections
par, bhsa, tfdir, proj = sys.argv[1:5]
sys.path.insert(0, tfdir)
from tfload import load
T = os.path.join(bhsa, 'tf', '2021') + '/'
bk = load(T + 'book.tf'); ch = load(T + 'chapter.tf'); vs = load(T + 'verse.tf')
FIX = {'Samuel_I': 'I Samuel', 'Samuel_II': 'II Samuel', 'Reges_I': 'I Kings', 'Reges_II': 'II Kings', 'Chronica_I': 'I Chronicles', 'Chronica_II': 'II Chronicles',
       'Canticum': 'Song of Songs', 'Deuteronomium': 'Deuteronomy', 'Numeri': 'Numbers', 'Josua': 'Joshua', 'Judices': 'Judges', 'Jesaia': 'Isaiah', 'Jeremia': 'Jeremiah',
       'Ezechiel': 'Ezekiel', 'Jona': 'Jonah', 'Micha': 'Micah', 'Habakuk': 'Habakkuk', 'Zephania': 'Zephaniah', 'Sacharia': 'Zechariah', 'Maleachi': 'Malachi', 'Obadia': 'Obadiah',
       'Psalmi': 'Psalms', 'Iob': 'Job', 'Proverbia': 'Proverbs', 'Threni': 'Lamentations', 'Esra': 'Ezra', 'Nehemia': 'Nehemiah'}
def ref(n):
    b = bk.get(n); c = ch.get(n); v = vs.get(n)
    if not b or not c or not v: return None
    return FIX.get(b, b), int(c), int(v)
out = collections.defaultdict(lambda: collections.defaultdict(dict)); n = 0
for ln in open(os.path.join(par, 'tf', '2021', 'crossref.tf'), encoding='utf8'):
    p = ln.rstrip('\n').split('\t')
    if len(p) < 3 or ln.startswith('@'): continue
    a = ref(int(p[0]))
    if not a: continue
    ts = []
    for t in p[1].split(','):
        if '-' in t: x, y = t.split('-'); ts += range(int(x), int(y) + 1)
        else: ts.append(int(t))
    for t in ts:
        b = ref(t)
        if not b or a == b: continue
        out['%s %d' % (a[0], a[1])][a[2]]['%s %d:%d' % b] = int(p[2])
        out['%s %d' % (b[0], b[1])][b[2]].setdefault('%s %d:%d' % a, int(p[2]))  # beide Richtungen
res = {k: {str(v): ['%s~%d' % (r, s) for r, s in sorted(d.items(), key=lambda x: -x[1])] for v, d in sorted(vv.items())} for k, vv in out.items()}
open(os.path.join(proj, 'parallels.js'), 'w', encoding='utf8').write('// ETCBC Parallels (MIT), https://github.com/ETCBC/parallels, auf Basis der BHSA\nwindow.PARALLELS=' + json.dumps(res, ensure_ascii=False, separators=(',', ':')) + ';\n')
n = sum(len(x) for d in out.values() for x in d.values()); print('Paare', n, 'Kapitel', len(res))
