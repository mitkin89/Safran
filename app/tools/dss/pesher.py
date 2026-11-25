#!/usr/bin/env python3
"""Pescher-Zitate: Zeilen der Qumran-Pescharim -> Verse des kommentierten biblischen Buches (Wortfolgen ab 4 Wörtern, Konsonantengerüst ohne ו/י).
Aufruf: python3 -I tools/dss/pesher.py <Safran-Projektordner>   (schreibt Zeilen „Pesher-Zitat“ in bundled/links; frühere Zeilen dieser Art werden ersetzt)"""
import sys, os, re, json, glob, collections
proj = sys.argv[1]
OWN = os.path.join(proj, 'bundled', 'own'); LD = os.path.join(proj, 'bundled', 'links')
PESHER = [('Pesher Habakkuk (1QpHab)', 'Habakkuk'), ('Pesher Isaiah (4Q163)', 'Isaiah')]
N = int(os.environ.get('PESHER_N', '4')); TYPE = 'Pesher-Zitat'
FIN = str.maketrans('ךםןףץ', 'כמנפצ')
def skel(w):
    w = re.sub(r'[^א-ת]', '', w).translate(FIN)
    return re.sub('[וי]', '', w) or w
def strip(h): return re.sub(r'<[^>]+>', '', h or '')
def words(h): return [skel(x) for x in re.split(r'[\s־]+', strip(h)) if re.sub(r'[^א-ת]', '', x)]
def load(title, pref):
    d = glob.glob(os.path.join(OWN, title, 'he', pref + '*.json'))
    return json.load(open(d[0], encoding='utf8'))['text']
for ptitle, bbook in PESHER:
    bible = load(bbook, 'Westminster'); pes = load(ptitle, 'Qumran')
    grams = collections.defaultdict(set)
    seq = []  # (Wort, Kap, Vers) fortlaufend über das ganze Buch
    for ci, ch in enumerate(bible, 1):
        for vi, v in enumerate(ch, 1):
            for w in words(v): seq.append((w, ci, vi))
    for i in range(len(seq) - N + 1):
        grams[tuple(x[0] for x in seq[i:i + N])].add(i)
    toks = []  # (Wort, Fragment, Zeile)
    for fi, fr in enumerate(pes, 1):
        for li, ln in enumerate(fr, 1):
            for w in words(ln): toks.append((w, fi, li))
    hit = collections.defaultdict(set)  # (Fragment, Zeile, Kap, Vers) -> Wortpositionen im Pescher
    for i in range(len(toks) - N + 1):
        for b in grams.get(tuple(t[0] for t in toks[i:i + N]), ()):
            for k in range(N):
                _, f, l = toks[i + k]; _, c, v = seq[b + k]
                hit[(f, l, c, v)].add(i + k)
    pairs = sorted((k) for k, s in hit.items() if len(s) >= 2)
    prow, brow = [], []
    for f, l, c, v in pairs:
        prow.append('%d:%d\t%s %d:%d\t%s\tSecond Temple' % (f, l, bbook, c, v, TYPE))
        brow.append('%d:%d\t%s %d:%d\t%s\tSecond Temple' % (c, v, ptitle, f, l, TYPE))
    for name, new in ((ptitle, prow), (bbook, brow)):
        fn = os.path.join(LD, name + '.tsv')
        old = [x for x in open(fn, encoding='utf8').read().split('\n') if x and not x.endswith('\t%s\tSecond Temple' % TYPE)] if os.path.exists(fn) else []
        open(fn, 'w', encoding='utf8').write('\n'.join(old + new) + '\n')
    print(ptitle, '->', bbook, ':', len(pairs), 'Zeilen-Vers-Paare;', len({(f, l) for f, l, _, _ in pairs}), 'Pescher-Zeilen,', len({(c, v) for _, _, c, v in pairs}), 'Verse')
