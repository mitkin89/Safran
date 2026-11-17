#!/usr/bin/env python3
"""Belegte aramäische Formen und Vorkommen aus Safrans Targum-Texten, ohne neue Textanalyse."""
import hashlib, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy']
SOURCES = [('Onkelos', 'Targum Onkelos (ETCBC Targum Corpus, Sperber)'), ('Neofiti 1', 'Targum Neofiti 1 (ETCBC Targum Corpus, Grundtext)'), ('Pseudo-Jonathan', 'Targum Pseudo-Jonathan (ETCBC Targum Corpus, BL Add. Ms. 2703)')]
lex = json.loads((ROOT/'targum-lex.js').read_text().split('=', 1)[1].strip().rstrip(';'))
words = re.compile(r'<span class="wt" data-l="([0-9a-f]+)" data-m="([^"]*)">([^<]*)</span>')
forms, books, provenance = {}, [], []
total = 0
def base36(n):
    s = ''
    while n:
        n, r = divmod(n, 36); s = '0123456789abcdefghijklmnopqrstuvwxyz'[r] + s
    return s or '0'
for tag, vt in SOURCES:
    for book in BOOKS:
        file = ROOT/'bundled'/'own'/book/'other'/(vt+'.json')
        raw = file.read_bytes(); data = json.loads(raw)
        bi = len(books); books.append([book, vt, tag, sum(bool(words.search(v or '')) for ch in data['text'] for v in ch)])
        provenance.append({'rel': file.relative_to(ROOT).as_posix(), 'sha1': hashlib.sha1(raw).hexdigest()})
        for ch, verses in enumerate(data['text'], 1):
            for verse, html in enumerate(verses, 1):
                for lid, code, word in words.findall(html or ''):
                    if not lex.get(lid, [''])[0]: continue
                    forms.setdefault(lid, {}).setdefault((word, code), []).append(bi*1000000+ch*1000+verse)
                    total += 1
out = {'B': books, 'groups': [[tag, 5] for tag, _ in SOURCES], 'L': {}, 'total': total}
for lid, entries in forms.items():
    rows = []
    for (word, code), refs in entries.items():
        last = 0; diffs = []
        for ref in refs: diffs.append(base36(ref-last)); last = ref
        rows.append([word, code, '.'.join(diffs)])
    out['L'][lid] = [lex[lid], rows]
(ROOT/'targum-forms.js').write_text('// ETCBC Targum Corpus (CC BY-NC 4.0); erzeugt mit tools/targum/forms.py.\nwindow.TARGUM_FORMS='+json.dumps(out, ensure_ascii=False, separators=(',', ':'))+';\n')
(ROOT/'tools/targum/forms-source.json').write_text(json.dumps({'tokens': total, 'lemmas': len(out['L']), 'sources': provenance}, ensure_ascii=False, indent=2)+'\n')
print(f'Targum-Formen: {total} Wörter, {len(out["L"])} Lemmata, {len(books)} Buchfassungen')
