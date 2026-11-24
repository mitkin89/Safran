#!/usr/bin/env python3
"""Validate source-bound editorial explanations and emit the offline app data."""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
source = json.loads((ROOT / 'tools/hexapla/explanations.json').read_text())
books = {}
for key, record in source['records'].items():
    match = re.fullmatch(r'(.*) (\d+:\d+)#(\d+) (.+)', key)
    if not match:
        raise ValueError(f'Invalid explanation key: {key}')
    book, ref, index, siglum = match.groups()
    if book not in books:
        text = (ROOT / 'hexapla-data' / (book.replace(' ', '_') + '.js')).read_text()
        books[book] = json.loads(text.split(']=', 1)[1].strip().removesuffix(';'))
    unit = books[book]['verses'][ref][int(index)]
    # Editorial qualifiers remain in the source/display but not in normalized witness keys.
    witness_text = re.sub(r'\((?:juxta\s+ed\.|s\.|fort\.|potius)\s+[^()]*\)', '', unit['t'])
    witness_text = re.sub(r'\s+', ' ', witness_text)
    if unit['t'] != record['unitText'] or (siglum not in unit['t'] and siglum not in witness_text):
        raise ValueError(f'Source changed; recheck explanation: {key}')
    for note_id, snapshot in record.get('noteSources', {}).items():
        if books[book]['notes'].get(note_id) != snapshot:
            raise ValueError(f'Footnote changed; recheck explanation: {key}: {note_id}')
    variants = record.get('variants')
    if variants is not None and (not variants or len({(v.get('reading'), v.get('forWord')) for v in variants}) != len(variants)):
        raise ValueError(f'Missing or duplicate reading selectors: {key}')
    for note in variants if variants is not None else [record]:
        if not note.get('n') or not note.get('en') or (variants is not None and not note.get('reading')):
            raise ValueError(f'Missing explanation/translation/reading: {key}')
target = ROOT / 'hexapla-explanations.js'
output = '// Editorial explanations; source snapshots checked by tools/hexapla/build_explanations.py.\nwindow.HEXAPLA_EXPLANATIONS=' + json.dumps(source, ensure_ascii=False, separators=(',', ':')) + ';\n'
if '--check' in sys.argv:
    if not target.exists() or target.read_text() != output:
        raise ValueError('Run python3 tools/hexapla/build_explanations.py to update app data')
else:
    target.write_text(output)
print(f"{len(source['records'])} source-bound explanations verified")
