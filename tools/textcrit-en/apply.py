#!/usr/bin/env python3
"""English versions of the German apparatus notes (LXX and Peshitta readings, Hexapla Vorlage/Deutung).
tools/textcrit-en/notes-en.json maps every German note to its English translation (Claude, 2026).
This script writes them as an "en" field next to "note" (lxx-readings/, peshitta-readings/) and next to "n"
(hexapla-vorlage.js). The app shows "en" when the interface is English. Run again after regenerating these files.
Usage: python3 tools/textcrit-en/apply.py"""
import json, re, glob, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[2]
EN = json.loads((ROOT / 'tools/textcrit-en/notes-en.json').read_text(encoding='utf-8'))
missing = set()
def fix(obj):
    if isinstance(obj, dict):
        for key in ('note', 'n'):
            de = obj.get(key)
            if isinstance(de, str) and de:
                if de in EN: obj['en'] = EN[de]
                else: missing.add(de); obj.pop('en', None)
        for v in obj.values(): fix(v)
    elif isinstance(obj, list):
        for v in obj: fix(v)
def rewrite(path, pattern):
    s = path.read_text(encoding='utf-8')
    m = re.search(pattern, s, re.S)
    data = json.loads(m.group(2)); fix(data)
    s = s[:m.start(2)] + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + s[m.end(2):]
    path.write_text(s, encoding='utf-8')
for d in ('lxx-readings', 'peshitta-readings'):
    for f in sorted((ROOT / d).glob('*.js')):
        if f.name == 'index.js': continue
        rewrite(f, r'(\]=)(\{.*\})(;?\s*)$')
rewrite(ROOT / 'hexapla-vorlage.js', r'(HEXAPLA_VORLAGE=)(\{.*\})(;?\s*)$')
print('missing', len(missing))
for x in sorted(missing)[:20]: print('  ', x)
sys.exit(1 if missing else 0)
