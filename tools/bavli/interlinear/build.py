#!/usr/bin/env python3
"""Experimentelle Bavli-Wortzuordnung, mit ausdrücklich getrennten Prüfständen."""
import collections
import hashlib
import html
import json
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def read(p):
    return json.loads(p.read_text())


def build():
    source = read(HERE / 'source.json')
    hebrew = read(HERE.parent / 'berakhot/source.json')
    parts = sorted(HERE.glob('alignment-*.json'))
    assert parts, 'Zuordnungsdateien fehlen'
    pages = {}
    notes = []
    for p in parts:
        d = read(p)
        for page, alignment in d['pages'].items():
            assert page not in pages, ('Doppelte Blattseite', page)
            pages[page] = alignment
        notes.extend(d.get('notes', []))
    assert set(pages) == set(source['pages']) == set(hebrew['pages']), 'Blattumfang weicht ab'
    coverage = {}
    out = {}
    for page in source['pages']:
        words = {}
        rows = []
        for vi, row in enumerate(hebrew['pages'][page], 1):
            tokens = html.unescape(re.sub(r'<[^>]+>', '', row)).split()
            rr = []
            for wi, word in enumerate(tokens, 1):
                anchor = f'{page}:{vi}/{wi}'
                words[anchor] = word
                rr.append([anchor, word])
            rows.append(rr)
        out[page] = {'he': rows}
        coverage[page] = {}
        for version in source['versions']:
            groups = pages[page][version]
            expected = ' '.join(source['pages'][page][version])
            actual = ' '.join(g['de'] for g in groups if g['de'])
            assert actual == expected, (page, version, 'Deutscher Wortlaut verändert')
            counts = collections.Counter()
            mapped = set()
            for gi, g in enumerate(groups):
                assert isinstance(g['de'], str) and g['de'].strip() == g['de'], (page, version, gi)
                assert g.get('status') in ('reviewed', 'machine', 'uncertain'), (page, version, gi, 'Prüfstatus fehlt')
                assert isinstance(g['he'], list) and len(set(g['he'])) == len(g['he']), (page, version, gi)
                assert all(a in words for a in g['he']), (page, version, gi, 'Unbekannter Wortanker')
                counts[g['status']] += len(g['de'].split())
                mapped.update(g['he'])
            out[page][version] = groups
            coverage[page][version] = {'germanWords': len(expected.split()), 'groups': len(groups), 'statuses': dict(counts), 'mappedHebrewWords': len(mapped), 'unmappedHebrewWords': sum(bool(re.search('[א-ת]', w)) and a not in mapped for a, w in words.items())}
    result = {'title': source['title'], 'range': source['range'], 'experimental': True, 'versions': source['versions'], 'coverage': coverage, 'pages': out, 'notes': notes,
              'sourceSha256': hashlib.sha256((HERE / 'source.json').read_bytes()).hexdigest(),
              'hebrewSourceSha256': hashlib.sha256((HERE.parent / 'berakhot/source.json').read_bytes()).hexdigest()}
    payload = json.dumps(result, ensure_ascii=False, separators=(',', ':'))
    (ROOT / 'bavli-il-data.js').write_text('// Erzeugt von tools/bavli/interlinear/build.py; Prüfstatus je Gruppe erhalten.\n(function(g){const d=' + payload + ';if(typeof module!=="undefined"&&module.exports)module.exports=d;else g.BAVLI_IL=d;})(typeof window!=="undefined"?window:globalThis);\n')
    (HERE / 'coverage.json').write_text(json.dumps(coverage, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'pages': len(out), 'versions': list(source['versions']), 'germanWords': sum(v['germanWords'] for p in coverage.values() for v in p.values()), 'statuses': dict(sum((collections.Counter(v['statuses']) for p in coverage.values() for v in p.values()), collections.Counter()))}, ensure_ascii=False))


if __name__ == '__main__':
    build()
