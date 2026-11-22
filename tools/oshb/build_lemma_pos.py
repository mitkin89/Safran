#!/usr/bin/env python3
"""Part of speech and frequency of the Westminster lemmas that share their consonants
with another lemma (homographs), counted in the bundled Westminster Leningrad Codex.

Used to give a word from a Qumran scroll (ETCBC/Abegg: consonantal lemma and part of
speech, no meaning) the meaning of the matching Westminster lemma: among homographs,
those with the same part of speech, the most frequent first.

Writes oshb-lemma-pos.js: window.OSHB_LEMMA_POS = {id: [pos, count]} where pos is the
OSHB part-of-speech letter most often used for that lemma (V, N, A, R, C, D, T, P, Np, S).
"""
import json, re, collections, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
src = (root / 'oshb-lemmas.js').read_text(encoding='utf-8')
L = json.loads(src[src.index('{'):src.rstrip().rstrip(';').rindex('}') + 1])
cons = lambda s: re.sub('[ךםןףץ]', lambda m: 'כמנפצ'['ךםןףץ'.index(m.group())], re.sub('[^א-ת]', '', s))
groups = collections.defaultdict(list)
for k, v in L.items():
    if cons(v[0]): groups[cons(v[0])].append(k)
homographs = {k for ids in groups.values() if len(ids) > 1 for k in ids}
pos = collections.defaultdict(collections.Counter)
manifest = json.loads((root / 'bundled/manifest.json').read_text(encoding='utf-8'))
for e in manifest['items']:
    if not (e.get('versionTitle') or '').startswith('Westminster'): continue
    doc = json.loads((root / 'bundled' / e['rel']).read_text(encoding='utf-8'))
    for ch in doc['text']:
        for verse in ch:
            for lem, morph in re.findall(r'data-l="([^"]*)" data-m="([^"]*)"', verse):
                ls, ms = lem.split('/'), morph[1:].split('/')
                if len(ls) != len(ms): continue
                for l, m in zip(ls, ms):
                    l = l.strip()
                    if l not in homographs or not m: continue
                    p = 'Np' if m.startswith('Np') else m[0]
                    pos[l][p] += 1
out = {k: [c.most_common(1)[0][0], sum(c.values())] for k, c in sorted(pos.items(), key=lambda x: (len(x[0]), x[0]))}
(root / 'oshb-lemma-pos.js').write_text(
    '// Wortart und Häufigkeit gleich geschriebener Westminster-Lemmata (Homographen); tools/oshb/build_lemma_pos.py\n'
    'window.OSHB_LEMMA_POS=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print(len(homographs), 'Homographen,', len(out), 'im Westminster-Text belegt')
