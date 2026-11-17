#!/usr/bin/env python3
"""Interlinear: Westminster-Wörter <-> deutsche Wörter (Zunz, Breuer, Philippson, Herxheimer, Goldschmidt, Hirsch, Julius Hirsch, Wolf, Mendelssohn).
Eingabe: tools/interlinear/<zunz|breuer|philippson|herxheimer|goldschmidt|hirsch|julius-hirsch|wolf|mendelssohn>/<Buch>.txt, je Vers eine Zeile
    Kapitel:Vers <TAB> Wort[,Wort…]:deutscher Text | Wort:Text | -:Text
  (Segmente in deutscher Reihenfolge; Wort = laufende Nummer des Westminster-Worts im Vers; „-“ = ohne hebräisches Gegenstück)
Prüft, dass die Segmente zusammen genau den Vers der Übersetzung ergeben und alle Nummern vorkommen können.
Ausgabe: interlin.js (window.INTERLIN = {Übersetzung: {Buch: {"1:1": [[[1],"Text"], …]}}})
Aufruf: python3 tools/interlinear/build.py"""
import json, glob, re, os, sys, hashlib
R = os.path.join(os.path.dirname(__file__), '..', '..')
norm = lambda s: re.sub(r'\s+', ' ', s).strip()
def load(book, lang, pat):
    f = glob.glob(os.path.join(R, 'bundled', 'own', book, lang, pat))[0]
    return json.load(open(f, encoding='utf8'))['text']
TR = {'Zunz': ('zunz', '*Zunz*', 'Zunz, Berlin 1838'), 'Breuer': ('breuer', '*Breuer*', 'Breuer'), 'Philippson': ('philippson', 'Die Israelitische Bibel*', 'Philippson'), 'Herxheimer': ('herxheimer', 'Die vier und zwanzig Bücher der Bibel im ebräischen*', 'Herxheimer'), 'Goldschmidt': ('goldschmidt', '*Goldschmidt*', 'Goldschmidt, Berlin 1921'), 'Hirsch': ('hirsch', '*Samson Raphael Hirsch*', 'Hirsch, Pentateuch 1867–1878 und Psalmen 1882'), 'JuliusHirsch': ('julius-hirsch', '*Julius Hirsch*', 'Julius Hirsch, Jesaia und Trei Asar'), 'Wolf': ('wolf', 'Wolf*', 'Wolf, Das Buch Samuel'), 'Mendelssohn': ('mendelssohn', '*Moses Mendelssohn*', 'Mendelssohn, Dessau 1815'), 'Umschrift': ('phono', 'Umschrift (ETCBC phono)*', 'Umschrift (ETCBC phono)', 'other')}  # Umschrift: maschinell aus tools/phono/build.py
out, sources, bad = {}, {}, 0
for name, (dirn, pat, label, *lng) in TR.items():
  out[name] = {}
  sources[name] = {}
  for fn in sorted(glob.glob(os.path.join(os.path.dirname(__file__), dirn, '*.txt'))):
    book = os.path.basename(fn)[:-4]
    he = load(book, 'he', 'Westminster*'); de = load(book, lng[0] if lng else 'de', pat)
    def source_meta(lang, pattern, text):
        source_path = glob.glob(os.path.join(R, 'bundled', 'own', book, lang, pattern))[0]
        source_doc = json.load(open(source_path, encoding='utf8'))
        payload = json.dumps(text, ensure_ascii=False, separators=(',', ':')).encode('utf8')
        return {'versionTitle': source_doc['versionTitle'], 'textHash': hashlib.sha256(payload).hexdigest()}
    sources[name][book] = {'he': source_meta('he', 'Westminster*', he), 'translation': source_meta(lng[0] if lng else 'de', pat, de)}
    nw = lambda c, v: len(re.findall(r'<span class="w"', he[c - 1][v - 1]))
    dt = lambda c, v: norm(re.sub(r'<[^>]+>', '', re.sub(r'<sup class="footnote-marker">.*?</sup><i class="footnote">.*?</i>', '', de[c - 1][v - 1])))
    res = {}
    for line in open(fn, encoding='utf8'):
        line = line.rstrip('\n')
        if not line: continue
        k, rest = line.split('\t', 1); c, v = map(int, k.split(':'))
        segs, txt = [], []
        for s in (x.strip() for x in rest.split(' | ')):
            m = re.match(r'^([\d,]+|-):(.*)$', s)
            if not m: print(name, book, k, 'Format:', s); bad += 1; continue
            idx = [int(x) for x in m.group(1).split(',')] if m.group(1) != '-' else []
            if any(i < 1 or i > nw(c, v) for i in idx): print(name, book, k, 'Wortnummer', idx, 'von', nw(c, v)); bad += 1
            segs.append([idx, m.group(2)]); txt.append(m.group(2))
        if norm(' '.join(txt)) != dt(c, v): print(name, book, k, 'Text weicht ab'); bad += 1
        res[k] = segs
    out[name][book] = res
if bad: sys.exit('Fehler: %d' % bad)
p = os.path.join(R, 'interlin.js')
open(p, 'w', encoding='utf8').write('// Interlinear: Westminster-Wörter mit deutscher Wortzuordnung (Zunz, Breuer, Philippson, Herxheimer, Goldschmidt, Hirsch, Julius Hirsch, Wolf, Mendelssohn) – erzeugt von tools/interlinear/build.py\nwindow.INTERLIN=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
open(os.path.join(R, 'interlin-sources.js'), 'w', encoding='utf8').write('// Quellstände der Wortzuordnungen; erzeugt von tools/interlinear/build.py\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else window.INTERLIN_SOURCES=d;})(' + json.dumps(sources, ensure_ascii=False, separators=(',', ':')) + ');\n')
print('%s -> interlin.js (%d Bytes)' % ('; '.join('%s: %s %d Verse' % (n, ', '.join(b), sum(len(v) for v in b.values())) for n, b in out.items()), os.path.getsize(p)))
