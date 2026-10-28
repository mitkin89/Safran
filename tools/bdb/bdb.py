#!/usr/bin/env python3
"""Unabridged BDB (Brown-Driver-Briggs, gemeinfrei; Aufbereitung Eliran Wong, marvel.bible) -> DSL-Datei für Safran.
Aufruf: python3 -I bdb.py <unabridged-BDB-Hebrew-lexicon.csv> <Ausgabe.dsl>
Danach: node tools/bdb/build.js <Ausgabe.dsl> <Safran-Projektordner>  (legt das Wörterbuch unter bundled/dict ab)"""
import csv, re, sys, html
csv.field_size_limit(10**9)
src, out = sys.argv[1:3]
rows = list(csv.reader(open(src, encoding='utf8'), delimiter='\t'))[1:]
def esc(s): return re.sub(r'([\[\]{}\\<>])', r'\\\1', s)
OPEN = {'bdbheb': '[b]', 'bdbarc': '[b]', 'grk': '[b]', 'highlight': '[i]', 'highlightword': '[i]', 'b': '[b]', 'big': '[b]', 'u': '[u]', 'sup': '[sup]', 'sub': '[sub]', 'reflink': '[ref]'}
CLOSE = {'bdbheb': '[/b]', 'bdbarc': '[/b]', 'grk': '[/b]', 'highlight': '[/i]', 'highlightword': '[/i]', 'b': '[/b]', 'big': '[/b]', 'u': '[/u]', 'sup': '[/sup]', 'sub': '[/sub]', 'reflink': '[/ref]'}
def conv(h):
    h = re.sub(r'<(checkingNeeded|wrongReferenceRemoved|placeholder\d*)\s*/>', '', h)
    res = []
    for t in re.finditer(r'<(/?)([A-Za-z0-9]+)[^>]*?(/?)>|([^<]+)', h):
        if t.group(4) is not None: res.append(esc(html.unescape(t.group(4)))); continue
        close, tag = t.group(1), t.group(2)
        if tag == 'br': res.append('\n')
        elif close: res.append(CLOSE.get(tag, ''))
        elif not t.group(3): res.append(OPEN.get(tag, ''))
    s = ''.join(res)
    s = re.sub(r'\[ref\]\s*\[/ref\]', '', s)
    return s
def plain(h): return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', h))).strip()
n = 0
with open(out, 'w', encoding='utf8') as f:
    f.write('#NAME "BDB – Brown-Driver-Briggs (ungekürzt)"\n#INDEX_LANGUAGE "Hebrew"\n#CONTENTS_LANGUAGE "English"\n\n')
    for bid, strong, content in rows:
        body = re.sub(r'<h1>.*?</h1>', '', content, flags=re.S)
        body = re.sub(r'<div class="navigation">.*?</div>', '', body, flags=re.S)
        paras = [p for p in re.findall(r'<p>(.*?)</p>', body, flags=re.S) if plain(p)]
        if not paras: continue
        heads = []
        for p in paras:
            m = re.match(r'\s*\[?\s*<bdbheb>(.*?)</bdbheb>', p, flags=re.S)
            if m:
                w = plain(m.group(1))
                if w and w not in heads: heads.append(w)
        if not heads:
            m = re.search(r'<bdbheb>(.*?)</bdbheb>', body, flags=re.S)
            if m: heads.append(plain(m.group(1)))
        if strong: heads.append(strong)
        heads.append(bid)
        heads = [re.sub(r'([{}\\()~@<>\[\]])', r'\\\1', h) for h in heads]
        f.write('\n'.join(heads) + '\n')
        for p in paras:
            for line in conv(p).split('\n'):
                if line.strip(): f.write('\t[m1]' + line.strip() + '[/m]\n')
        f.write('\n'); n += 1
print('Einträge', n)
