#!/usr/bin/env python3
"""Extract MACULA clause relations and align them with Safran's Westminster text."""

import argparse
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SOURCE = '47db250bd55d0d8577f2a94fba114ef16c35b23c'
BOOKS = [('Genesis', 'Gen', 50), ('Exodus', 'Exo', 40), ('Leviticus', 'Lev', 27),
         ('Numbers', 'Num', 36), ('Deuteronomy', 'Deu', 34)]
VERSION = 'Westminster Leningrad Codex (OSHB, mit Morphologie)'
SPAN = re.compile(r'<span class="w" data-l="[^"]*" data-m="[^"]*">(.*?)</span>')
REF = re.compile(r'[A-Z0-9]+ (\d+):(\d+)!(\d+)')
SUBJECT_CLASSES = {'noun', 'pron', 'adj', 'num', 'verb'}


def letters(text):
    return ''.join(re.findall(r'[א-ת]', text))


def verse_key(chapter, verse):
    return f'{chapter}:{verse}'


def word_ref(word):
    return tuple(map(int, REF.fullmatch(word.attrib['ref']).groups()))


def subject_words(node):
    if node.tag == 'w':
        if node.get('class') in SUBJECT_CLASSES:
            yield node
        return
    if node.get('class') in {'cl', 'relp', 'pp'}:
        return
    if node.get('rule') in {'NPofNP', 'NpAdjp', 'NpRelp'}:
        # A construct dependent, adjectival modifier or relative clause does not name the subject.
        if len(node):
            yield from subject_words(node[0])
        return
    for child in node:
        yield from subject_words(child)


def verbs(node):
    if node.tag == 'w':
        if node.get('class') == 'verb' and node.get('lemma'):
            yield node
        return
    for child in node:
        if child.tag == 'w' or child.get('class') == 'vp':
            yield from verbs(child)


def align(expected, actual):
    # Maqaf can produce different word boundaries. Map only whole-word spans
    # in the Westminster edition after comparing every consonant in the verse.
    if not all(expected.values()) or not all(actual) or ''.join(expected.values()) != ''.join(actual):
        return {}
    bounds = {0: 0}
    offset = 0
    for i, word in enumerate(actual, start=1):
        offset += len(word)
        bounds[offset] = i
    mapping = {}
    start = 0
    for ordinal, word in expected.items():
        end = start + len(word)
        if start in bounds and end in bounds:
            mapping[ordinal] = tuple(range(bounds[start], bounds[end]))
        start = end
    return mapping


def build(book, code, chapters, book_number, source_dir):
    verses = defaultdict(lambda: defaultdict(dict))
    pairs = set()
    ambiguous = set()
    for chapter in range(1, chapters + 1):
        xml_file = source_dir / f'{book_number:02}-{code}-{chapter:03}-lowfat.xml'
        root = ET.parse(xml_file).getroot()
        for word in root.iter('w'):
            c, v, ordinal = word_ref(word)
            # The last digit identifies the morpheme within an orthographic word.
            form = letters(word.text or '')
            if not form:
                continue
            word_id = word.attrib['{http://www.w3.org/XML/1998/namespace}id']
            segment = int(re.match(r'o\d+', word_id).group()[-1])
            existing = verses[c, v][ordinal].setdefault(segment, form)
            if existing != form:
                ambiguous.add((c, v))
        for clause in root.iter('wg'):
            if clause.get('class') != 'cl':
                continue
            predicates = [w for child in clause if child.get('role') == 'v' for w in verbs(child)]
            for child in clause:
                if child.get('role') != 's':
                    continue
                subject = tuple(sorted(set(map(word_ref, child.iter('w')))))
                heads = tuple(sorted({letters(w.get('lemma', '')) for w in subject_words(child)} - {''}))
                if heads:
                    for predicate in predicates:
                        pairs.add((word_ref(predicate), letters(predicate.get('lemma', '')), heads, subject))

    doc = json.loads((ROOT / 'bundled' / 'own' / book / 'he' / f'{VERSION}.json').read_text(encoding='utf-8'))
    alignments = {}
    for (c, v), words in verses.items():
        if (c, v) in ambiguous or c > len(doc['text']) or v > len(doc['text'][c - 1]):
            continue
        expected = {n: ''.join(segment for _, segment in sorted(words[n].items())) for n in sorted(words)}
        actual = [letters(m) for m in SPAN.findall(doc['text'][c - 1][v - 1])]
        mapping = align(expected, actual)
        if mapping:
            alignments[c, v] = (mapping, ' '.join(actual))

    grouped_pairs = defaultdict(list)
    signatures = {}
    for (c, v, n), lemma, heads, subject in sorted(pairs):
        if not lemma or any((sc, sv) not in alignments or sn not in alignments[sc, sv][0]
                            for sc, sv, sn in [(c, v, n), *subject]):
            continue
        predicate = alignments[c, v][0][n]
        if len(predicate) != 1:
            continue
        key = verse_key(c, v)
        signatures[key] = alignments[c, v][1]
        refs = defaultdict(list)
        for sc, sv, sn in subject:
            subject_key = verse_key(sc, sv)
            signatures[subject_key] = alignments[sc, sv][1]
            refs[subject_key].extend(alignments[sc, sv][0][sn])
        grouped_pairs[key].append([predicate[0], lemma, heads, list(refs.items())])

    payload = dict(version=1, source=SOURCE, text=signatures, pairs=grouped_pairs)
    destination = ROOT / 'bundled' / 'syntax' / f'{book}.json'
    content = json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n'
    destination.write_text(content, encoding='utf-8', newline='\n')
    usable = sum(map(len, grouped_pairs.values()))
    print(f'{book}: {len(alignments)}/{len(verses)} verses aligned, {usable}/{len(pairs)} relations; '
          f'SHA-256 {hashlib.sha256(content.encode()).hexdigest()}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_dir', type=Path, help='WLC/lowfat from MACULA Hebrew ' + SOURCE)
    args = parser.parse_args()
    for number, (book, code, chapters) in enumerate(BOOKS, start=1):
        build(book, code, chapters, number, args.source_dir)


if __name__ == '__main__':
    main()
