#!/usr/bin/env python3
"""Interlinear: Westminster-Wörter <-> deutsche Wörter (Zunz, Berlin 1838).
Eingabe: tools/interlinear/zunz/<Buch>.txt, je Vers eine Zeile
    Kapitel:Vers <TAB> Wort[,Wort…]:deutscher Text | Wort:Text | -:Text
  (Segmente in deutscher Reihenfolge; Wort = laufende Nummer des Westminster-Worts im Vers; „-“ = ohne hebräisches Gegenstück)
Prüft, dass die Segmente zusammen genau den Zunz-Vers ergeben und alle Nummern vorkommen können.
Ausgabe: interlin-zunz.js (window.INTERLIN_ZUNZ = {Buch: {"1:1": [[[1],"Text"], …]}})
Aufruf: python3 tools/interlinear/build.py"""
import json, glob, re, os, sys
R = os.path.join(os.path.dirname(__file__), '..', '..')
norm = lambda s: re.sub(r'\s+', ' ', s).strip()
def load(book, lang, pat):
    f = glob.glob(os.path.join(R, 'bundled', 'own', book, lang, pat))[0]
    return json.load(open(f, encoding='utf8'))['text']
out, bad = {}, 0
for fn in sorted(glob.glob(os.path.join(os.path.dirname(__file__), 'zunz', '*.txt'))):
    book = os.path.basename(fn)[:-4]
    he = load(book, 'he', 'Westminster*'); de = load(book, 'de', '*Zunz*')
    nw = lambda c, v: len(re.findall(r'<span class="w"', he[c - 1][v - 1]))
    dt = lambda c, v: norm(re.sub(r'<[^>]+>', '', de[c - 1][v - 1]))
    res = {}
    for line in open(fn, encoding='utf8'):
        line = line.rstrip('\n')
        if not line: continue
        k, rest = line.split('\t', 1); c, v = map(int, k.split(':'))
        segs, txt = [], []
        for s in (x.strip() for x in rest.split(' | ')):
            m = re.match(r'^([\d,]+|-):(.*)$', s)
            if not m: print(book, k, 'Format:', s); bad += 1; continue
            idx = [int(x) for x in m.group(1).split(',')] if m.group(1) != '-' else []
            if any(i < 1 or i > nw(c, v) for i in idx): print(book, k, 'Wortnummer', idx, 'von', nw(c, v)); bad += 1
            segs.append([idx, m.group(2)]); txt.append(m.group(2))
        if norm(' '.join(txt)) != dt(c, v): print(book, k, 'Text weicht ab'); bad += 1
        res[k] = segs
    out[book] = res
if bad: sys.exit('Fehler: %d' % bad)
p = os.path.join(R, 'interlin-zunz.js')
open(p, 'w', encoding='utf8').write('// Interlinear: Westminster-Wörter mit der deutschen Wortzuordnung aus Zunz (Berlin 1838) – erzeugt von tools/interlinear/build.py\nwindow.INTERLIN_ZUNZ=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('%s: %d Verse -> interlin-zunz.js (%d Bytes)' % (', '.join(out), sum(len(v) for v in out.values()), os.path.getsize(p)))
