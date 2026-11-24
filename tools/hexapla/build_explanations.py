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
    if unit['t'] != record['unitText'] or siglum not in unit['t']:
        raise ValueError(f'Source changed; recheck explanation: {key}')
    if not record.get('n') or not record.get('en'):
        raise ValueError(f'Missing explanation/translation: {key}')
target = ROOT / 'hexapla-explanations.js'
output = '// Editorial explanations; source snapshots checked by tools/hexapla/build_explanations.py.\nwindow.HEXAPLA_EXPLANATIONS=' + json.dumps(source, ensure_ascii=False, separators=(',', ':')) + ';\n'
if '--check' in sys.argv:
    if not target.exists() or target.read_text() != output:
        raise ValueError('Run python3 tools/hexapla/build_explanations.py to update app data')
else:
    target.write_text(output)
print(f"{len(source['records'])} source-bound explanations verified")
