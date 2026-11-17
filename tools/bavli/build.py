#!/usr/bin/env python3
"""Baut die eigene, quellgebundene Morphologie für Berakhot 2a–10b.

Originaltext und Edition bleiben als Quelle separat erhalten. Jeder Wortplatz
verweist auf eine kontextbezogene Analyse; Mehrdeutigkeit bleibt explizit.
"""
import argparse
import hashlib
import html
import json
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SOURCE = HERE / 'berakhot/source.json'
VERSION = 'William Davidson Edition – Safran-Morphologie (Berakhot 2a–10b)'
OUTPUT = ROOT / 'bundled/own/Berakhot/he' / (VERSION + '.json')

def read(path):
    return json.loads(path.read_text())

def plain(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s))

def candidates(e):
    if e.get('status') == 'unresolved':
        return []
    return e.get('analyses', [e] if e.get('morph') else [])

def check_analysis(a, context):
    assert a.get('lemma'), (context, 'Lemma fehlt')
    assert a.get('lang') in ('H', 'A'), (context, 'Sprache fehlt')
    m = a.get('morph', '')
    assert m.startswith(a['lang']) and len(m) > 1, (context, 'Morphologie/Sprachkennzeichen', m)
    for p in m[1:].split('/'):
        assert re.fullmatch(r'(?:C|D|R[d]?|T[adeijmnor]?|N[cgp][mfcbx]?[spdx]?[acdx]?|A[acgo][mfcbx]?[spdx]?[acdx]?|P[dfipr][123x]?[mfcbx]?[spdx]?|S[dhn]|Sp[123x][mfcbx][spdx]|V[qQNpPhHtomMkKOlLfDjiucvwyzQsaebGr](?:[pqiwhjvrsac][123xmfcb]?[mfcbspdx]?[spdacx]?)?)', p), (context, 'Ungültiges Teilmerkmal', p, m)

def collect(paths):
    lexicon, segments = {}, {}
    for p in paths:
        d = read(p)
        for key, e in d['lexicon'].items():
            if key == 'punct':
                continue
            key = 'bavli:' + key
            assert key not in lexicon, ('Doppelte Analyse-ID', key)
            status = e.get('status', 'reviewed')
            assert status in ('reviewed', 'ambiguous', 'partial', 'unresolved'), (key, status)
            e['status'] = status
            aa = candidates(e)
            assert aa or status == 'unresolved', (key, 'Analyse fehlt')
            for a in aa:
                check_analysis(a, key)
            if status != 'reviewed':
                assert e.get('note'), (key, 'Unsicherheit ohne Erklärung')
            lexicon[key] = e
        for ref, ids in d['segments'].items():
            assert ref not in segments, ('Doppeltes Segment', ref)
            segments[ref] = ['punct' if i == 'punct' else 'bavli:' + i for i in ids]
    return lexicon, segments

def common_morph(e):
    aa = candidates(e)
    mm = {a['morph'] for a in aa}
    return next(iter(mm)) if len(mm) == 1 else ''

def annotate(original, ids, lexicon, ref):
    tokens = re.findall(r'\S+', plain(original))
    assert len(tokens) == len(ids), (ref, len(tokens), len(ids))
    pieces = re.split(r'(<[^>]+>)', original)
    i, occurrences = 0, []
    for k in range(0, len(pieces), 2):
        # Diese Ausgabe enthält keine innerhalb eines Wortes gespaltenen HTML-Tags.
        # Falls die Quelledition das ändert, bricht der Vergleich ab.
        def word(m):
            nonlocal i
            raw = m[0]
            assert i < len(tokens) and html.unescape(raw) == tokens[i], (ref, 'HTML-Token weicht ab', raw, tokens[i:i+1])
            key = ids[i]
            token = i + 1
            i += 1
            if not re.search('[א-ת]', tokens[token-1]):
                assert key == 'punct', (ref, token, 'Satzzeichen mit Wortanalyse')
                return raw
            assert key in lexicon, (ref, token, 'Analyse fehlt', key)
            e = lexicon[key]
            occurrences.append({'ref': ref, 'token': token, 'word': tokens[token-1], 'id': key})
            return '<span class="w" data-l="' + html.escape(key, quote=True) + '" data-m="' + html.escape(common_morph(e), quote=True) + '">' + raw + '</span>'
        pieces[k] = re.sub(r'\S+', word, pieces[k])
    assert i == len(tokens), (ref, 'Nicht alle Token übernommen')
    result = ''.join(pieces)
    assert plain(result) == plain(original), (ref, 'Quellwortlaut verändert')
    return result, occurrences

def build(paths, validate_only=False):
    source = read(SOURCE)
    lexicon, segments = collect(paths)
    expected = {f'Berakhot {page}:{v}' for page, rows in source['pages'].items() for v in range(1, len(rows)+1)}
    assert set(segments) == expected, ('Segmentumfang', sorted(expected-set(segments)), sorted(set(segments)-expected))
    pages = [[], []]
    occurrences = []
    for page, rows in source['pages'].items():
        out = []
        for v, text in enumerate(rows, 1):
            result, oo = annotate(text, segments[f'Berakhot {page}:{v}'], lexicon, f'Berakhot {page}:{v}')
            out.append(result)
            occurrences += oo
        pages.append(out)
    used = {o['id'] for o in occurrences}
    lexicon = {k: e for k, e in lexicon.items() if k in used}
    totals = {status: sum(lexicon[o['id']]['status'] == status for o in occurrences) for status in ('reviewed', 'ambiguous', 'partial', 'unresolved')}
    report = {'segments': len(expected), 'words': len(occurrences), 'statuses': totals, 'source_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest()}
    if validate_only:
        print(json.dumps(report, ensure_ascii=False))
        return
    d = {'title':'Berakhot', 'heTitle':'ברכות', 'language':'Hebrew', 'versionTitle':VERSION,
         'versionSource':source['versionSource'], 'sectionNames':['Daf','Line'],
         'license':source['license'], 'versionNotes':'Eigene kontextbezogene Morphologie für Berakhot 2a–10b. Nach Yitzhak Frank (2003) und Bar-Asher Siegal (2013); H/A-Merkmalsinventar nach OSHB, eigene Lemmata. Mehrdeutige und unbestimmte Stellen sind ausdrücklich gekennzeichnet. Originalwortlaut der William Davidson Edition unverändert.',
         'attribution':source['attribution'], 'text':pages}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')))
    data = {'version':1,'title':'Berakhot','range':'2a–10b','source':{k:v for k,v in source.items() if k!='pages'},
            'lexicon':lexicon,'occurrences':occurrences,'coverage':report}
    (ROOT/'bavli-morph.js').write_text('// Eigene Bavli-Morphologie; erzeugt von tools/bavli/build.py.\n(function(D){if(typeof module!=="undefined"&&module.exports)module.exports=D;else window.BAVLI_MORPH=D;})('+json.dumps(data,ensure_ascii=False,separators=(',',':'))+');\n')
    manifest_path = ROOT/'bundled/manifest.json'
    manifest = read(manifest_path)
    rel = str(OUTPUT.relative_to(ROOT/'bundled'))
    item = {'rel':rel,'title':'Berakhot','heTitle':'ברכות','language':'Hebrew','versionTitle':VERSION,
            'categories':['Talmud','Bavli','Seder Zeraim'],'kind':'he','hash':hashlib.sha1(OUTPUT.read_bytes()).hexdigest()}
    manifest['items'] = [x for x in manifest['items'] if x['rel'] != rel] + [item]
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')))
    print(json.dumps(report,ensure_ascii=False))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--validate-only',action='store_true')
    args = ap.parse_args()
    build(sorted((HERE/'berakhot').glob('annotations-*.json')), args.validate_only)
