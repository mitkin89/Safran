#!/usr/bin/env python3
"""Aleppo text (MAM, CACCHT) as an interlinear line under the Westminster/OSHB words -> aleppo-il/<Book>.js.

Same alignment as compare.py (consonants, whole chapter, difflib), but every Aleppo word is kept, as printed in
MAM (vowels, accents, meteg, qamats qatan; maqaf stays on the word before it). Per MT verse a list (see pack): a plain string is an
unchanged word on the next MT word (1-based, as the .w spans of the verse); otherwise [MT word number(s), text, flag]
with flag k/p/v/a/w for a difference (kinds as in compare.py, '' = same), '+' for an Aleppo word without counterpart,
'-' for an MT word without counterpart. Ketiv spans of the OSHB get nothing
(MAM prints only the Qere). Usage: python3 tools/aleppo/interlinear.py"""
import json, re, pathlib, difflib, collections, importlib.util, sys
ROOT = pathlib.Path(__file__).resolve().parents[2]
src = (ROOT / 'tools/aleppo/compare.py').read_text(encoding='utf-8')
# reuse norm/cons/kind/doc/books from compare.py without running its loop
ns = {'__file__': str(ROOT / 'tools/aleppo/compare.py')}
exec(src.split('total=collections.Counter()')[0], ns)
norm, cons, kind, doc, books, VOW = ns['norm'], ns['cons'], ns['kind'], ns['doc'], ns['books'], ns['VOW']
OUT = ROOT / 'aleppo-il'; OUT.mkdir(exist_ok=True)

def words(verse):
    """MAM verse -> printed words; a maqaf stays at the end of its word."""
    out = []
    for tok in re.split(r'\s+', verse.replace('׀', ' ')):
        for piece in re.findall(r'[^־]+־?', tok):
            n = norm(piece)
            if n in ('ס', 'פ') or not cons(n): continue
            out.append((re.sub('[͏]', '', piece), n))
    return out

def pack(segs):
    """Compact form: a plain string is an unchanged word on the MT word after the previous one;
    otherwise [MT word number or list ([] for an addition), text, flag] with flag k/p/v/a/w, '+' addition, '-' missing."""
    out, prev = [], 0
    for ix, t, _, meta in segs:
        if meta is None and ix == [prev + 1]: out.append(t)
        else:
            f = meta['d'] if meta and 'd' in meta else '+' if meta and meta.get('kind') == 'addition' else '-' if meta else ''
            out.append([ix[0] if len(ix) == 1 else ix, t, f] if f != '-' else [ix[0] if len(ix) == 1 else ix, '', '-'])
        if ix: prev = max(ix)
    return out

total = collections.Counter()
for book in sorted(books):
    W = doc(book, 'Westminster'); A = doc(book, 'Aleppo'); out = {}; cnt = collections.Counter()
    for ci, ch in enumerate(W):
        mlw = []; maw = []
        for vi, v in enumerate(ch):
            for wi, x in enumerate(re.findall(r'<span class="w"[^>]*>(.*?)</span>', v)):
                w = norm(re.sub('<[^>]*>', '', x))
                if VOW.search(w) or len(cons(w)) < 2: mlw.append((vi, wi, w))
        for a in (A[ci] if ci < len(A) else []): maw += words(a)
        if not mlw or not maw: continue
        segs = collections.defaultdict(list)
        sm = difflib.SequenceMatcher(None, [cons(w) for _, _, w in mlw], [cons(n) for _, n in maw], autojunk=False)
        last_v = mlw[0][0]
        for op, i1, i2, j1, j2 in sm.get_opcodes():
            if op == 'equal' or (op == 'replace' and i2 - i1 == j2 - j1):
                for x, y in zip(range(i1, i2), range(j1, j2)):
                    vi, wi, w = mlw[x]; k = kind(w, maw[y][1]); last_v = vi
                    segs[vi].append([[wi + 1], maw[y][0], None, {'d': k} if k else None]); cnt[k or '=']+= 1
            elif op == 'delete':
                for x in range(i1, i2):
                    vi, wi, _ = mlw[x]; last_v = vi
                    segs[vi].append([[wi + 1], '—', None, {'kind': 'missing'}]); cnt['missing'] += 1
            elif op == 'insert':
                vi = mlw[i1 - 1][0] if i1 > 0 else mlw[0][0]
                for y in range(j1, j2):
                    segs[vi].append([[], maw[y][0], None, {'kind': 'addition'}]); cnt['addition'] += 1
            else:  # replace with a different number of words: one group per MT verse, the Aleppo words on the first
                first = True
                for vi in sorted({mlw[x][0] for x in range(i1, i2)}):
                    ix = [mlw[x][1] + 1 for x in range(i1, i2) if mlw[x][0] == vi]
                    segs[vi].append([ix, ' '.join(t for t, _ in maw[j1:j2]) if first else '—', None, {'d': 'w'} if first else {'kind': 'missing'}])
                    first = False; cnt['w'] += 1
        for vi, s in segs.items(): out[f'{ci + 1}:{vi + 1}'] = pack(s)
    (OUT / (book.replace(' ', '_') + '.js')).write_text(
        '// Aleppo-Text (MAM, CACCHT, CC BY-SA 4.0) Wort für Wort unter dem Westminster-MT; tools/aleppo/interlinear.py\n'
        'window.ALEPPO_IL=window.ALEPPO_IL||{};window.ALEPPO_IL[' + json.dumps(book) + ']='
        + json.dumps({'book': book, 'verses': out}, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    total.update(cnt); print(book, dict(cnt))
print('gesamt', dict(total))
