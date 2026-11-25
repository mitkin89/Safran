#!/usr/bin/env python3
# python3 merge_outline_tr.py <outlines-Ordner> <tr-Ordner>: fügt <Buch>.tr.json (…_de/…_en-Felder) in outlines/<Buch>.json ein
import json, sys, os, re, glob
od, td = sys.argv[1], sys.argv[2]
HE = re.compile(r'[֐-׿]')
for f in sorted(glob.glob(os.path.join(td, '*.tr.json'))):
    tr = json.load(open(f, encoding='utf8')); book = tr['book']
    p = os.path.join(od, book + '.json'); src = json.load(open(p, encoding='utf8'))
    assert len(src['sections']) == len(tr['sections']), (book, 'Abschnitte')
    for k in ('title', 'note'):
        for l in ('de', 'en'):
            if tr.get(f'{k}_{l}'): src[f'{k}_{l}'] = tr[f'{k}_{l}']
    miss = []
    for si, (s, t) in enumerate(zip(src['sections'], tr['sections'])):
        assert len(s['items']) == len(t['items']), (book, si, 'Einträge')
        for l in ('de', 'en'):
            for k in ('head', 'desc'):
                if k in s:
                    v = t.get(f'{k}_{l}')
                    if v: s[f'{k}_{l}'] = v
                    else: miss.append((si, k, l))
        for ii, (a, b) in enumerate(zip(s['items'], t['items'])):
            for k in ('text', 'place', 'par', 'time', 'speaker', 'author', 'kind', 'seg', 'desc'):
                if k not in a: continue
                for l in ('de', 'en'):
                    v = b.get(f'{k}_{l}')
                    if v: a[f'{k}_{l}'] = v
                    else: miss.append((si, ii, a['ref'], k, l))
    json.dump(src, open(p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    he = sum(1 for s in src['sections'] for i in s['items'] for k in ('text_de', 'text_en', 'par_de', 'par_en', 'place_de', 'place_en') if HE.search(i.get(k, '')))
    print(book, 'ok | fehlende Übersetzungen:', len(miss), miss[:4], '| Einträge mit Hebräisch in Übersetzung:', he)
