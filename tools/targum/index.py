#!/usr/bin/env python3
"""Targum-Index für die Wortkarte: Lexem/Wurzel -> Verse (Neofiti 1, Pseudo-Jonathan), aus den eingebauten Targum-Texten.
Aufruf: python3 -I tools/targum/index.py <Safran-Projektordner>   (schreibt targum-idx.js)"""
import json, re, sys, os
proj = sys.argv[1]
BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy']
TG = [('Targum Neofiti 1 (ETCBC Targum Corpus, Grundtext).json', 0), ('Targum Pseudo-Jonathan (ETCBC Targum Corpus, BL Add. Ms. 2703).json', 1)]
lex = json.loads(open(os.path.join(proj, 'targum-lex.js'), encoding='utf8').read().split('=', 1)[1].rstrip().rstrip(';'))
FIN = str.maketrans('ךםןףץ', 'כמנפצ')
def key(s): return re.sub(r'[^א-ת]', '', s).translate(FIN)
idx = {}
for bi, b in enumerate(BOOKS):
    for fn, tg in TG:
        p = os.path.join(proj, 'bundled', 'own', b, 'other', fn)
        if not os.path.exists(p): continue
        for ci, chap in enumerate(json.load(open(p, encoding='utf8'))['text'], 1):
            for vi, v in enumerate(chap, 1):
                ref = ((bi * 100 + ci) * 1000 + vi) * 2 + tg
                for lid in set(re.findall(r'class="wt" data-l="([0-9a-f]+)"', v or '')):
                    for k in {key(x) for x in lex.get(lid, ['', ''])[:2]}:
                        if k: idx.setdefault(k, set()).add(ref)
def delta(v):
    v = sorted(v); return [v[0]] + [b - a for a, b in zip(v, v[1:])]
out = {k: delta(v) for k, v in sorted(idx.items())}
open(os.path.join(proj, 'targum-idx.js'), 'w', encoding='utf8').write(
    '// Targum-Index (ETCBC Targum Corpus, MIT): Lexem/Wurzel -> Verse (Differenzen zum Vorgänger); Zahl = ((Buch*100+Kapitel)*1000+Vers)*2+Targum (0 Neofiti, 1 Pseudo-Jonathan)\nwindow.TARGUM_IDX=' + json.dumps({'b': BOOKS, 'r': out}, separators=(',', ':'), ensure_ascii=False) + ';\n')
print(len(out), 'Schlüssel', sum(len(v) for v in out.values()), 'Belege')
