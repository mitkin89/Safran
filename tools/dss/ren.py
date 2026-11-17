#!/usr/bin/env python3
"""Wortkarte: Was haben die biblischen Qumran-Rollen dort, wo der masoretische Text (Westminster) ein Lemma hat?
Aus qumran-il.js (tools/dss/il.py): je Vorkommen des Lemmas die Lesart jeder Rolle, die die Stelle erhalten hat –
gleich, andere Schreibweise (Plene, lange Endungen) oder andere Lesart; rekonstruierte Wörter (Herausgeber) zählen nicht.
Ausgabe: qumran-ren.js – Format wie lxx-ren.js: {Lemma: [[Bezeichnung …], [[Gruppe, OSHB-Code, Anzahl, Stellen] …]]};
Bezeichnung „Art:Wort“ (0 = gleich, 1 = Schreibweise, 2 = Lesart), Gruppe 30 = alle weiteren („*“); Stellen wie interlin-ren.js.
Aufruf: python3 -I tools/dss/ren.py [Projektordner]"""
import json, re, os, sys, glob, collections
proj = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings', 'Isaiah', 'Jeremiah', 'Ezekiel',
         'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job', 'Song of Songs',
         'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles']
s = open(os.path.join(proj, 'qumran-il.js'), encoding='utf8').read()
Q = json.loads(s[s.index('window.'):].split('=', 1)[1].strip().rstrip(';'))

def mcode(dl, dm):  # wie tools/interlinear/renderings.py
    ls, ms = dl.split('/'), dm[1:].split('/')
    i = next((k for k, x in enumerate(ls) if re.search(r'\d', x)), len(ls) - 1)
    main = ms[i] if i < len(ms) else ms[-1]
    suf = [x for x in ms[i + 1:] if x.startswith('S')]
    return dm[0] + main + ('/' + suf[0] if suf else '')
def b36(n):
    d = '0123456789abcdefghijklmnopqrstuvwxyz'; o = ''
    while True:
        n, r = divmod(n, 36); o = d[r] + o
        if not n: return o
word = lambda t: re.sub(r'[\[\](){}<>…?#^]', '', t).strip()

acc = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(list)))  # Lemma -> Bezeichnung -> Code -> Stellen
for book, verses in Q.items():
    if book not in BOOKS: continue
    bi = BOOKS.index(book)
    wf = glob.glob(os.path.join(proj, 'bundled', 'own', book, 'he', 'Westminster*.json'))
    if not wf: continue
    he = json.load(open(wf[0], encoding='utf8'))['text']
    for k, rows in verses.items():
        c, v = map(int, k.split(':'))
        if c > len(he) or v > len(he[c - 1]): continue
        ws = re.findall(r'<span class="w" data-l="([^"]*)" data-m="([^"]*)"', he[c - 1][v - 1])
        for sig, segs in rows:
            for idx, t, kind in segs:
                if len(idx) != 1 or kind not in (0, 1, 2) or not 1 <= idx[0] <= len(ws): continue
                dl, dm = ws[idx[0] - 1]
                lem = next((x.strip() for x in dl.split('/') if re.search(r'\d', x)), '')
                w = word(t)
                if not lem or not w or (kind and len(re.sub(r'[^א-ת]', '', w)) < 2): continue  # einzelne Vorsilbe (Zuordnungsrest): weglassen
                acc[lem]['0:=' if kind == 0 else '%d:%s' % (kind, w)][mcode(dl, dm)].append(bi * 1000000 + c * 1000 + v)
out = {}
for lem, L in acc.items():
    gs = sorted(L.items(), key=lambda x: (-sum(len(r) for r in x[1].values()), x[0] != '0:=', x[0]))
    labels, cells = [], []
    for i, (lab, M) in enumerate(gs):
        gi = min(i, 30)
        if i <= 30: labels.append('*' if i == 30 else lab)
        for code, R in M.items():
            R.sort(); prev = 0; enc = []
            for r in R: enc.append(b36(r - prev)); prev = r
            cells.append([gi, code, len(R), '.'.join(enc)])
    out[lem] = [labels, cells]
p = os.path.join(proj, 'qumran-ren.js')
with open(p, 'w', encoding='utf8') as f:
    f.write('// Wortkarte: Lesarten der biblischen Qumran-Rollen je Bestimmung des hebräischen Worts – erzeugt mit tools/dss/ren.py aus qumran-il.js (ETCBC DSS, CC BY-NC 4.0) und dem Westminster-Text (OSHB, CC BY 4.0)\n')
    f.write('// Format wie lxx-ren.js; Bezeichnung „Art:Wort“: 0 = gleich wie im masoretischen Text, 1 = andere Schreibweise, 2 = andere Lesart\n')
    f.write('window.QUMRAN_REN=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('qumran-ren.js', os.path.getsize(p), 'Bytes,', len(out), 'Lemmata')
