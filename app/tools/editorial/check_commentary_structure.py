#!/usr/bin/env python3
"""Flag long cross-chapter copies and ambiguous numbered boundaries for review."""
import collections
import json
import pathlib
import re

APP = pathlib.Path(__file__).resolve().parents[2]
reviewed = {
    ('Philippson on Leviticus', 1, 7),
    ('Philippson on Leviticus', 23, 1),
    ('Philippson on Jeremiah', 31, 31),
    ('Philippson on I Samuel', 17, 12),
    ('Philippson on Exodus', 12, 27),
    ('Philippson on Deuteronomy', 1, 6),
    ('Philippson on Proverbs', 1, 2),
}
copies, boundaries = [], []
for path in sorted((APP / 'bundled/own').glob('Philippson on */de/*.json')):
    doc = json.loads(path.read_text())
    index = collections.defaultdict(set)
    for chapter, verses in enumerate(doc['text'], 1):
        for verse, text in enumerate(verses, 1):
            words = re.findall(r'\w+', re.sub('<[^>]*>', ' ', text).lower())
            for start in range(len(words) - 29):
                index[tuple(words[start:start + 30])].add((chapter, verse))
            hit = re.search(r'—\s{1,3}' + str(chapter + 1) + r'\.\s', text)
            if hit and len(text) - hit.start() > 300:
                key = (doc['title'], chapter, verse)
                boundaries.append({
                    'book': doc['title'], 'ref': f'{chapter}:{verse}',
                    'reviewed': key in reviewed,
                    'decision': 'Same-chapter verse numbering; not a new chapter heading.'
                    if key in reviewed else 'Requires review',
                })
    pairs = collections.Counter()
    for refs in index.values():
        if len(refs) > 10:
            continue
        refs = sorted(refs)
        for offset, left in enumerate(refs):
            for right in refs[offset + 1:]:
                if left[0] != right[0]:
                    pairs[left, right] += 1
    for (left, right), count in pairs.items():
        if count >= 90:
            copies.append({'book': doc['title'], 'left': left, 'right': right,
                           'matching_30_word_windows': count})
report = {'long_cross_chapter_copy_candidates': copies,
          'numbered_boundary_candidates': boundaries}
destination = APP / 'tools/editorial/reports/philippson-structure-check.json'
destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'long_copy_candidates': len(copies),
                  'unreviewed_boundaries': sum(not x['reviewed'] for x in boundaries)}))
raise SystemExit(bool(copies or any(not x['reviewed'] for x in boundaries)))
