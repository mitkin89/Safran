#!/usr/bin/env python3
"""Extract MACULA clause relations and align them with Safran's Westminster text."""

import argparse
from collections import defaultdict
import hashlib
import gzip
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from projection import load as load_projection, project as project_words

ROOT = Path(__file__).resolve().parents[2]
SOURCE = '47db250bd55d0d8577f2a94fba114ef16c35b23c'
BOOKS = [('Genesis', 'Gen', 50), ('Exodus', 'Exo', 40), ('Leviticus', 'Lev', 27),
         ('Numbers', 'Num', 36), ('Deuteronomy', 'Deu', 34),
         ('Joshua', 'Jos', 24), ('Judges', 'Jdg', 21), ('Ruth', 'Rut', 4),
         ('I Samuel', '1Sa', 31), ('II Samuel', '2Sa', 24), ('I Kings', '1Ki', 22),
         ('II Kings', '2Ki', 25), ('I Chronicles', '1Ch', 29), ('II Chronicles', '2Ch', 36),
         ('Ezra', 'Ezr', 10), ('Nehemiah', 'Neh', 13), ('Esther', 'Est', 10),
         ('Job', 'Job', 42), ('Psalms', 'Psa', 150), ('Proverbs', 'Pro', 31),
         ('Ecclesiastes', 'Ecc', 12), ('Song of Songs', 'Sng', 8), ('Isaiah', 'Isa', 66),
         ('Jeremiah', 'Jer', 52), ('Lamentations', 'Lam', 5), ('Ezekiel', 'Ezk', 48),
         ('Daniel', 'Dan', 12), ('Hosea', 'HOS', 14), ('Joel', 'Jol', 4),
         ('Amos', 'Amo', 9), ('Obadiah', 'Oba', 1), ('Jonah', 'Jon', 4),
         ('Micah', 'Mic', 7), ('Nahum', 'Nam', 3), ('Habakkuk', 'Hab', 3),
         ('Zephaniah', 'Zep', 3), ('Haggai', 'Hag', 2), ('Zechariah', 'Zec', 14),
         ('Malachi', 'Mal', 3)]
VERSION = 'Westminster Leningrad Codex (OSHB, mit Morphologie)'
SPAN = re.compile(r'<span class="w" data-l="[^"]*" data-m="[^"]*">(.*?)</span>')
REF = re.compile(r'[A-Z0-9]+ (\d+):(\d+)!(\d+)')
HEAD_CLASSES = {'noun', 'pron', 'adj', 'num', 'verb'}
ROLES = {'s', 'v', 'o', 'io', 'p'}
XML_ID = '{http://www.w3.org/XML/1998/namespace}id'


def letters(text):
    return ''.join(re.findall(r'[א-ת]', text))


def verse_key(chapter, verse):
    return f'{chapter}:{verse}'


def word_ref(word):
    return tuple(map(int, REF.fullmatch(word.attrib['ref']).groups()))


def group_heads(node):
    if node.tag == 'w':
        if node.get('class') in HEAD_CLASSES:
            yield node
        return
    if node.get('class') in {'cl', 'relp', 'pp'}:
        return
    if node.get('rule') in {'NPofNP', 'NpAdjp', 'NpRelp'}:
        # A construct dependent, adjectival modifier or relative clause does not provide the lexical head.
        if len(node):
            yield from group_heads(node[0])
        return
    for child in node:
        yield from group_heads(child)


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


def word_refs(node):
    return tuple(sorted({word_ref(w) for w in node.iter('w') if letters(w.text or '')}))


def role_words(node):
    if node.tag == 'w':
        if letters(node.text or ''):
            yield word_ref(node)
        return
    if node.get('class') != 'cl':
        for child in node:
            yield from role_words(child)


def head_lemmas(words):
    return tuple(sorted({letters(w.get('lemma', '')) for w in words} - {''}))


def antecedents(words, attribute, by_id):
    pending = [ref for word in words for ref in re.findall(r'\d{12}', word.get(attribute, ''))]
    seen = set()
    resolved = set()
    while pending:
        key = pending.pop()
        if key in seen:
            continue
        seen.add(key)
        target = by_id.get(key)
        if target is None:
            continue
        following = re.findall(r'\d{12}', target.get('participantref', ''))
        if following:
            pending.extend(following)
        elif letters(target.text or ''):
            resolved.add(target)
    return resolved


def build(book, code, chapters, book_number, source_dir):
    verses = defaultdict(lambda: defaultdict(dict))
    ambiguous = set()
    by_id = {}
    clauses = []
    sentences = []
    for chapter in range(1, chapters + 1):
        xml_file = source_dir / f'{book_number:02}-{code}-{chapter:03}-lowfat.xml'
        root = ET.parse(xml_file).getroot()
        sentences.extend(node for node in root.iter('sentence'))
        clauses.extend(node for node in root.iter('wg') if node.get('class') == 'cl')
        for word in root.iter('w'):
            c, v, ordinal = word_ref(word)
            form = letters(word.text or '')
            if not form:
                continue
            word_id = word.attrib[XML_ID]
            number = re.match(r'o(\d+)', word_id).group(1)
            segment = int(number[-1])
            if word_id == 'o' + number:
                by_id[number] = word
            existing = verses[c, v][ordinal].setdefault(segment, form)
            if existing != form:
                ambiguous.add((c, v))

    doc = json.loads((ROOT / 'bundled' / 'own' / book / 'he' / f'{VERSION}.json').read_text(encoding='utf-8'))
    proof_data, proof, target_tokens, target_signatures = load_projection(book, doc, SPAN)
    source_rows = []
    for (c,v), words in sorted(verses.items()):
        if (c,v) in ambiguous:
            continue
        source_rows.append((verse_key(c,v), [((c,v,n), ''.join(segment for _,segment in sorted(words[n].items()))) for n in sorted(words)]))
    projected, verified_refs = project_words(source_rows, target_tokens, proof, 'qere')
    signatures = dict(target_signatures)
    remapped = set()
    for (c,v,n), locs in projected.items():
        if any(ref != verse_key(c,v) for ref,_ in locs):
            remapped.add(verse_key(c,v))

    def locations(refs):
        grouped = defaultdict(set)
        for key in refs:
            locs = projected.get(key)
            if not locs:
                return []
            for ref,indices in locs:
                grouped[ref].update(indices)
        return [[ref, sorted(indices)] for ref,indices in grouped.items()]

    # Additional source constituents are anchored to each predicate, without
    # changing the established subject/object record format.
    constituents = defaultdict(list)

    def content_heads(node):
        if node.tag == 'w':
            if node.get('class') in HEAD_CLASSES | {'adv'}:
                yield node
            return
        if node.get('class') in {'cl', 'relp'}:
            return
        children = list(node)
        if node.get('rule') in {'NPofNP', 'NpAdjp', 'NpRelp'}:
            children = children[:1]
        for child in children:
            if child.get('class') != 'pp':
                yield from content_heads(child)

    def local_nodes(node):
        for child in node:
            if child.get('class') != 'cl':
                yield child
                yield from local_nodes(child)

    def extra_groups(nodes, owners=None):
        groups, complete = [], True
        for node in nodes:
            refs = locations(tuple(role_words(node)))
            heads = []
            source_heads = list(content_heads(node))
            for word in source_heads:
                loc = locations([word_ref(word)])
                lemma = letters(word.get('lemma', ''))
                if not loc or len(loc) != 1 or len(loc[0][1]) != 1 or not lemma:
                    complete = False
                    continue
                heads.append([loc[0][0], loc[0][1][0], lemma, dict(form=letters(word.text or ''), morph=word.get('lang', 'H')+word.get('morph', ''), lemma=re.sub(r'^0+', '', word.get('strongnumberx', '')), sourceId=word.get(XML_ID))])
            if not refs or not source_heads or not heads:
                complete = False
            governors = []
            governor_complete = True
            if owners is not None:
                owner_heads = list(content_heads(owners[node]))
                for word in owner_heads:
                    loc = locations([word_ref(word)])
                    if not loc or len(loc) != 1 or len(loc[0][1]) != 1:
                        governor_complete = False
                    else:
                        governors.append([loc[0][0], loc[0][1][0], letters(word.get('lemma', ''))])
                if not owner_heads:
                    governor_complete = False
            if refs:
                groups.append(dict(refs=refs, heads=heads, **(dict(governors=governors, governorComplete=governor_complete) if owners is not None else {}), prepositions=sorted({letters(w.get('lemma', '')) for w in node if w.tag == 'w' and w.get('class') == 'prep'})))
        return dict(complete=complete, groups=groups)

    identities = defaultdict(list)
    for word in by_id.values():
        if word.get('class') not in HEAD_CLASSES | {'adv'}:
            continue
        own = locations([word_ref(word)])
        lemma = letters(word.get('lemma', ''))
        if len(own) != 1 or len(own[0][1]) != 1 or not lemma:
            continue
        target = own
        canonical = word.get(XML_ID)
        if word.get('participantref'):
            linked = antecedents([word], 'participantref', by_id)
            target = locations(sorted({word_ref(w) for w in linked}))
            canonical = next(iter(linked)).get(XML_ID) if len(linked) == 1 else None
        if canonical and len(target) == 1 and len(target[0][1]) == 1:
            identities[own[0][0]].append([own[0][1][0], lemma, target[0][0], target[0][1][0], canonical, bool(word.get('participantref'))])

    nominals = defaultdict(list)
    grouped_pairs = defaultdict(list)
    grouped_roles = defaultdict(list)
    for clause in clauses:
        subject_nodes = [child for child in clause if child.get('role') == 's']
        object_nodes = [child for child in clause if child.get('role') == 'o']
        predicates = [word for child in clause if child.get('role') == 'v' for word in verbs(child)]
        subject_heads = [word for child in subject_nodes for word in group_heads(child)]
        direct_subjects = [head_lemmas(group_heads(node)) for node in subject_nodes]
        direct_refs = [locations(word_refs(node)) for node in subject_nodes]
        object_heads = head_lemmas(word for node in object_nodes for word in group_heads(node))
        object_refs = locations(sorted({ref for node in object_nodes for ref in word_refs(node)}))
        # Keep only aligned role groups. A group may cross verse boundaries.
        for child in clause:
            role = child.get('role')
            if role not in ROLES:
                continue
            explicit = locations(word_refs(child))
            linked = antecedents(list(group_heads(child)), 'participantref', by_id) if role == 's' else []
            refs = locations(sorted({word_ref(w) for w in linked}))
            if not explicit:
                continue
            for key, indices in locations(sorted(set(role_words(child)))):
                grouped_roles[key].append([role, indices, explicit, refs])

        owners = {n[1]: n[0] for n in local_nodes(clause) if n.get('rule') in {'NPofNP', 'NpAdjp'} and len(n) == 2}
        extras = {
            'secondObject': extra_groups([n for n in clause if n.get('role') == 'o2']),
            'adverbial': extra_groups([n for n in clause if n.get('role') == 'adv']),
            'prepositional': extra_groups([n for n in clause if n.get('role') == 'pp']),
            'attribute': extra_groups(list(owners), owners),
        }
        if not predicates:
            refs = locations(tuple(ref for child in clause for ref in role_words(child)))
            if refs:
                roles = dict(extras, subject=extra_groups(subject_nodes), object=extra_groups(object_nodes))
                record = dict(refs=refs, roles=roles)
                for ref, _ in refs:
                    nominals[ref].append(record)
        for word in predicates:
            verb = locations([word_ref(word)])
            lemma = letters(word.get('lemma', ''))
            if not lemma or not verb or len(verb[0][1]) != 1:
                continue
            key, (position,) = verb[0]
            constituents[key].append([position, dict(extras, subject=extra_groups(subject_nodes), object=extra_groups(object_nodes))])
            linked = antecedents(subject_heads, 'participantref', by_id) if subject_nodes else antecedents([word], 'subjref', by_id)
            refs = locations(sorted({word_ref(w) for w in linked}))
            resolved_heads = head_lemmas(linked) if refs else ()
            if refs:
                grouped_roles[key].append(['v', [position], verb, refs])
            for heads, subject in zip(direct_subjects, direct_refs):
                if heads and subject:
                    grouped_pairs[key].append([position, lemma, heads, subject, object_heads, object_refs, resolved_heads, refs])
            if not subject_nodes and resolved_heads:
                grouped_pairs[key].append([position, lemma, [], [], object_heads, object_refs, resolved_heads, refs])
            if not subject_nodes and not resolved_heads and object_refs:
                grouped_pairs[key].append([position, lemma, [], [], object_heads, object_refs, [], []])

    def unique(rows):
        return {key: list({json.dumps(row, ensure_ascii=False): row for row in rows[key]}.values())
                for key in sorted(rows, key=lambda ref: tuple(map(int, ref.split(':'))))}

    payload = dict(version=2, source=SOURCE, text=signatures, pairs=unique(grouped_pairs), roles=unique(grouped_roles), constituents=unique(constituents),
                   identities=unique(identities), nominals=unique(nominals),
                   coverage=dict(sourceVerses=len(verses), alignedVerses=len(verified_refs),
                                 unalignedVerses=len(verses)-len(verified_refs), targetVerses=len(target_signatures), remappedSourceVerses=len(remapped), variantVerses=len({target_tokens[i][0] for i,_,_ in proof['variants']}), sourceClauses=len(clauses)),
                   alignment=dict(basis='qere', revision=proof_data['source']['revision'], variants=[[target_tokens[i][0],target_tokens[i][1],kind,identifier] for i,kind,identifier in proof['variants']]))
    destination = ROOT / 'bundled' / 'syntax' / f'{book}.json'
    # One line per verse makes index changes easier to review.
    content = '{\n' + ',\n'.join(
        json.dumps(field) + ':' + (
            '{\n' + ',\n'.join(json.dumps(k) + ':' + encode(v) for k, v in value.items()) + '\n}'
            if isinstance(value, dict) else encode(value))
        for field, value in payload.items()
    ) + '\n}\n'
    destination.write_text(content, encoding='utf-8', newline='\n')
    tree_text = {}
    def tree_node(node):
        if node.tag == 'w':
            c, v, ordinal = word_ref(node)
            locs = locations([(c,v,ordinal)])
            ref, ids = locs[0] if len(locs)==1 else (verse_key(c,v), [])
            for r,_ in locs:
                tree_text[r] = target_signatures[r]
            return dict(kind='word', role=node.get('role', ''), form=node.text or '',
                        lemma=letters(node.get('lemma', '')), ref=ref, sourceRef=verse_key(c,v), indices=ids)
        return dict(kind=node.get('class', 'sentence'), role=node.get('role', ''),
                    rule=node.get('rule', ''), children=[tree_node(n) for n in node if n.tag in {'w', 'wg'}])
    trees, by_ref = [], defaultdict(list)
    for sentence in sentences:
        nodes = [tree_node(n) for n in sentence if n.tag == 'wg']
        if not nodes:
            continue
        refs = sorted({ref for key in word_refs(sentence) for ref,_ in projected.get(key,[])})
        idx = len(trees)
        trees.append(dict(id=sentence.get('id', ''), children=nodes))
        for ref in refs:
            by_ref[ref].append(idx)
    tree_dir = ROOT / 'bundled' / 'syntax-trees'
    tree_dir.mkdir(exist_ok=True)
    tree_payload = dict(version=1, source=SOURCE, text=tree_text, trees=trees, byRef=dict(by_ref))
    (tree_dir / f'{book}.json.gz').write_bytes(gzip.compress(encode(tree_payload).encode('utf-8'), mtime=0))
    usable = sum(map(len, payload['pairs'].values()))
    print(f'{book}: {len(verified_refs)}/{len(verses)} verses aligned, {usable} predicate records; '
          f'SHA-256 {hashlib.sha256(content.encode()).hexdigest()}', flush=True)


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_dir', type=Path, help='WLC/lowfat from MACULA Hebrew ' + SOURCE)
    args = parser.parse_args()
    for number, (book, code, chapters) in enumerate(BOOKS, start=1):
        build(book, code, chapters, number, args.source_dir)


if __name__ == '__main__':
    main()
