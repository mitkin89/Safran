#!/usr/bin/env python3
"""Philippson: Text, Versumfang und Nummern prüfen; keine semantische Prüfung.
Ohne Argumente: vollständige Bücher im selben Ordner; einschließlich Ketiv/Qere.
Mit --partial PFAD: ausdrücklich unvollständigen, geprüften Teilstand prüfen.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]

def plain(text):
    text = re.sub(r'<sup class="footnote-marker">.*?</sup><i class="footnote">.*?</i>', '', text)
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', text)).strip()

def check(path, partial=False):
    book = path.stem
    base = ROOT / 'bundled' / 'own' / book
    de_path, = (base / 'de').glob('Die Israelitische Bibel*')
    he_path, = (base / 'he').glob('Westminster*')
    de = json.loads(de_path.read_text())['text']
    he = json.loads(he_path.read_text())['text']
    expected = {f'{c}:{v}' for c,ch in enumerate(he,1) for v,_ in enumerate(ch,1)}
    assert [len(ch) for ch in de] == [len(ch) for ch in he], f'{book}: Kapitel-/Verszählung'
    seen = set()
    for lineno,line in enumerate(path.read_text().splitlines(),1):
        if not line: continue
        ref,rest = line.split('\t',1)
        assert ref not in seen and ref in expected, f'{path}:{lineno}: doppelter/falscher Vers {ref}'
        seen.add(ref)
        c,v = map(int,ref.split(':'))
        nw = len(re.findall(r'<span class="w"', he[c-1][v-1]))
        texts = []
        segments = []
        for seg in rest.split(' | '):
            m = re.fullmatch(r'([\d,]+|-):(.*)',seg)
            assert m, (path,lineno,seg)
            ids = [] if m[1] == '-' else list(map(int,m[1].split(',')))
            assert all(1 <= n <= nw for n in ids), (path,ref,ids,nw)
            texts.append(m[2])
            segments.append(set(ids))
        assert plain(' '.join(texts)) == plain(de[c-1][v-1]), f'{book} {ref}: Text weicht ab'
        # Westminster enthält unvokalisierte Ketiv-Wörter vor der vokalisierten Qere.
        # Mehrwortiges Ketiv gehört zusammen mit dem folgenden Qere in ein Segment.
        words = re.findall(r'<span class="w"[^>]*>.*?</span>', he[c-1][v-1])
        i = 0
        while i < len(words):
            # Ruth 3:12 אם ist Ketiv ohne gelesenes Qere; גאל ist das nächste
            # eigenständige Wort und darf nicht als dessen Qere gruppiert werden.
            if (book, ref, i + 1) == ('Ruth', '3:12', 5):
                i += 1
                continue
            word = plain(words[i])
            if re.search('[א-ת]', word) and not re.search('[\u0591-\u05bd\u05bf-\u05c7]', word):
                start = i
                i += 1
                while i < len(words) and not re.search('[\u0591-\u05bd\u05bf-\u05c7]', plain(words[i])):
                    i += 1
                group = set(range(start + 1, i + 2))
                touched = [ids for ids in segments if ids & group]
                assert touched and all(group <= ids for ids in touched), f'{book} {ref}: Ketiv/Qere getrennt oder nicht zugeordnet: {sorted(group)}'
            i += 1
    if not partial:
        assert seen == expected, f'{book}: fehlende Verse {sorted(expected-seen)}'
    return {'book':book,'verses':len(seen),'expected':len(expected),'complete':seen==expected,
            'source_sha1':hashlib.sha1(de_path.read_bytes()).hexdigest(),
            'alignment_sha1':hashlib.sha1(path.read_bytes()).hexdigest()}

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--partial',type=Path)
    args = ap.parse_args()
    paths = [args.partial] if args.partial else sorted(HERE.glob('*.txt'))
    results = [check(p, bool(args.partial)) for p in paths]
    for r in results:
        print(f"{r['book']}: {r['verses']}/{r['expected']} – {'vollständig' if r['complete'] else 'Teilstand'}; Text/Nummern ok")
