"""Bridge project CollateX columns to the complete diplomatic source extract.

Project comparison strings never replace display text. Every original token,
including gaps and uncertain letters, must survive exactly once.
"""
from collections import defaultdict
import difflib
import re

HE = re.compile('[^א-ת]')
ID = re.compile(r'^([SV]\d+)\.1\.1\.(\d+)\.(\d+)\.\d+')


def damaged(word):
    return '□' in word['text'] or bool(set(word['flags']) & {'gap', 'damage', 'unclear'})


def bridge(units, tokens):
    """Exact character bridge within a source unit, without inventing text.

    The source and project use different whitespace and correction encodings.
    Require all surviving letters of both a project token and a display token
    to be accounted for. Word boundaries may split/join; gaps remain attached
    only when enclosed by letters of the same project word.
    """
    by_ref = defaultdict(list)
    for t in tokens:
        m = ID.match(t['id'])
        if not m:
            raise ValueError('Unknown project token ID: ' + t['id'])
        by_ref[m[2] + ':' + m[3]].append(t)
    mapped = {}
    for ref, group in by_ref.items():
        words = units[ref]['words']
        primary = [t for t in group if t['t'] != '--']
        a, a_owner, a_positions = '', [], defaultdict(set)
        for i, w in enumerate(words):
            text = HE.sub('', w['text'])
            a_positions[i].update(range(len(a), len(a) + len(text)))
            a += text
            a_owner.extend([i] * len(text))
        b, b_owner, b_positions = '', [], defaultdict(set)
        for t in primary:
            text = HE.sub('', t['t'])
            b_positions[t['id']].update(range(len(b), len(b) + len(text)))
            b += text
            b_owner.extend([t['id']] * len(text))
        matches = {}
        for block in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
            matches.update((j, block.a + j - block.b) for j in range(block.b, block.b + block.size))
        good = {tid for tid, positions in b_positions.items() if positions and positions <= matches.keys()}
        covered = {matches[j] for tid in good for j in b_positions[tid]}
        whole = {i for i, positions in a_positions.items() if positions and positions <= covered}
        local = {}
        for tid in good:
            indices = {a_owner[matches[j]] for j in b_positions[tid]}
            if not indices <= whole:
                continue
            # Preserve internal gap-only display tokens between the word's letters.
            indices.update(i for i in range(min(indices), max(indices) + 1)
                           if not HE.sub('', words[i]['text']) and damaged(words[i]))
            local[tid] = [[ref, i] for i in sorted(indices)]
        # Extra normalized expansion tokens refer to the same original word.
        roots = defaultdict(list)
        for tid, pairs in local.items():
            roots[ID.match(tid)[0]].extend(pairs)
        for t in group:
            if t['t'] == '--':
                local[t['id']] = [list(p) for p in dict.fromkeys(map(tuple, roots[ID.match(t['id'])[0]]))]
        mapped.update(local)
    return mapped


def position_gaps(units, stream, links, base_order):
    """Place gap-only tokens between their actual source neighbours.

    This is a source boundary, not a lexical match or a reconstruction. Never
    step over an unbridged surviving word or reverse the reference anchors.
    """
    lookup = {tuple(p): link for link in links for p in link['reading']}
    order = {p: i for i, p in enumerate(stream)}
    additions = []
    i = 0
    while i < len(stream):
        r, n = stream[i]
        word = units[r]['words'][n]
        if stream[i] in lookup or HE.sub('', word['text']) or 'gap' not in word['flags']:
            i += 1
            continue
        start = i
        while i < len(stream):
            r, n = stream[i]
            word = units[r]['words'][n]
            if stream[i] in lookup or HE.sub('', word['text']) or 'gap' not in word['flags']:
                break
            i += 1
        left_pair = stream[start - 1] if start else None
        right_pair = stream[i] if i < len(stream) else None
        left = lookup.get(left_pair)
        right = lookup.get(right_pair)
        if (left_pair and not left) or (right_pair and not right) or not (left or right):
            continue
        if left is right and left:
            # A multiword project column already encloses this source boundary.
            left['reading'].extend(map(list, stream[start:i]))
            left['reading'].sort(key=lambda p: order[tuple(p)])
            left['uncertain'] = True
            left.setdefault('sourceGaps', []).extend(map(list, stream[start:i]))
            continue
        after = (left['base'][-1] if left['base'] else left['after']) if left else None
        before = (right['base'][0] if right['base'] else right['after']) if right else None
        if left and after is None:
            # Initial additions have no preceding base word.
            if not right or not right['base']:
                continue
        if after and before and base_order[tuple(after)] > base_order[tuple(before)]:
            continue
        ref = after[0] if after else before[0] if before else None
        if ref is None:
            continue
        additions.append({'ref': ref, 'base': [], 'reading': list(map(list, stream[start:i])),
                          'after': after, 'before': before, 'kind': 'source-gap',
                          'checked': False, 'uncertain': True,
                          'sourceAnchors': {'left': list(left_pair) if left_pair else None,
                                            'right': list(right_pair) if right_pair else None},
                          'projectWords': {s: sorted(set((left or {}).get('projectWords', {}).get(s, [])
                                                        + (right or {}).get('projectWords', {}).get(s, [])))
                                           for s in (left or right).get('projectWords', {})},
                          'method': 'Digital Mishnah / CollateX (automated)',
                          'positionMethod': 'source-neighbour boundary; no lexical reconstruction'})
    links.extend(additions)


def apply_boundary_reviews(data, sig, ch, mapped, reviews, base_stream, base_order):
    """Split explicitly reviewed multiword damage groups, never the source text."""
    edition = 'vocalized' if data['witnesses']['K']['id'] == 'V00001' else 'diplomatic'
    for review in reviews.get('boundaries', []):
        if review['witness'] != sig or not review['source'][0][0].startswith(ch + ':'):
            continue
        actual = [data['witnesses'][sig]['units'][r]['words'][i]['text'] for r, i in review['source']]
        assert actual == review['expectedSource'], 'Boundary review source changed: ' + review['id']
        targets = review['targets'][edition]
        source_pairs = set(map(tuple, review['source']))
        base_pairs = {tuple(p) for t in targets for p in t['base']}
        touched = [l for l in mapped if source_pairs.intersection(map(tuple, l['reading']))
                   or base_pairs.intersection(map(tuple, l['base']))]
        assert review['projectWord'] in {id for l in touched for id in l['projectWords'][sig]}, review['id']
        assert {tuple(p) for l in touched for p in l['reading']} == source_pairs, review['id']
        assert {tuple(p) for l in touched for p in l['base']} == base_pairs, review['id']
        replacements = []
        for target in targets:
            text = ''.join(data['witnesses']['K']['units'][r]['words'][i]['text'] for r, i in target['base'])
            assert HE.sub('', text) == target['expectedBaseConsonants'], review['id']
            first = base_order[tuple(target['base'][0])]
            replacements.append({'ref': target['base'][0][0], 'base': target['base'], 'reading': target['reading'],
                                 'after': list(base_stream[first - 1]) if first else None,
                                 'kind': 'project', 'checked': False, 'boundaryChecked': True, 'uncertain': True,
                                 'boundaryReview': review['id'], 'reason': review['reason'],
                                 'projectWords': {s: sorted({id for l in touched for id in l['projectWords'][s]}) for s in ['K', sig]},
                                 'method': 'Digital Mishnah / CollateX (automated)'})
        # Gap-only tokens are deliberately left for position_gaps, which gives
        # them their own source boundary rather than a lexical counterpart.
        start = min(mapped.index(l) for l in touched)
        mapped[:] = [l for l in mapped if l not in touched]
        mapped[start:start] = replacements


def refine_damage_boundaries(data, sig, mapped, base_stream, base_order):
    """Split a damaged comparison word only with unique physical support.

    Require two surviving prefix/suffix fragments, an adjacent empty reference
    cell, and exactly the encoded number of missing characters (including one
    word boundary). This places fragments; it does not fill the source gap.
    """
    for link in list(mapped):
        pairs = link['reading']
        if len(pairs) < 3 or not link['base'] or len({r for r, i in pairs}) != 1:
            continue
        ref = pairs[0][0]
        unit = data['witnesses'][sig]['units'][ref]
        ws = [unit['words'][i] for r, i in pairs]
        gap_positions = [j for j, w in enumerate(ws) if not HE.sub('', w['text']) and 'gap' in w['flags']]
        if len(gap_positions) != 1 or gap_positions[0] in [0, len(ws) - 1]:
            continue
        g = gap_positions[0]
        # Do not infer lexical boundaries across discontinuous source groups.
        if [i for r, i in pairs] != list(range(pairs[0][1], pairs[-1][1] + 1)):
            continue
        gaps = [a for a in unit['annotations'] if a['tag'] == 'gap'
                and a['start'] <= ws[g]['start'] and a['end'] >= ws[g]['end']]
        if len(gaps) != 1 or gaps[0]['attrs'].get('unit') != 'chars':
            continue
        extent = gaps[0]['attrs'].get('extent', '')
        if not extent.isdigit():
            continue
        left = ''.join(HE.sub('', w['text']) for w in ws[:g])
        right = ''.join(HE.sub('', w['text']) for w in ws[g + 1:])
        if min(len(left), len(right)) < 1 or max(len(left), len(right)) < 3 or len(left) + len(right) < 4:
            continue
        index = mapped.index(link)
        start = end = index
        while start > 0 and not mapped[start - 1]['reading'] and mapped[start - 1]['base']:
            start -= 1
        while end + 1 < len(mapped) and not mapped[end + 1]['reading'] and mapped[end + 1]['base']:
            end += 1
        region = mapped[start:end + 1]
        candidates = []
        for a, b in zip(region, region[1:]):
            if link is not a and link is not b:
                continue
            if len({r for r, i in a['base'] + b['base']}) != 1:
                continue
            def key(entry):
                return ''.join(HE.sub('', data['witnesses']['K']['units'][r]['words'][i]['text']) for r, i in entry['base'])
            ka, kb = key(a), key(b)
            # A definite article in the reading edition may be absent from a
            # manuscript. It is a variant outside this physical gap.
            forms = [ka] + ([ka[1:]] if ka.startswith('ה') else [])
            if any(x.startswith(left) and kb.endswith(right)
                   and len(x) - len(left) + len(kb) - len(right) + 1 == int(extent) for x in forms):
                candidates.append((a, b))
        if len(candidates) != 1:
            continue
        a, b = candidates[0]
        replacements = []
        for target, reading in [(a, pairs[:g]), (b, pairs[g + 1:])]:
            first = base_order[tuple(target['base'][0])]
            replacements.append({**target, 'reading': reading,
                                 'after': list(base_stream[first - 1]) if first else None,
                                 'kind': 'project', 'checked': False, 'uncertain': True,
                                 'boundaryMethod': 'unique fragments and encoded gap extent',
                                 'gapExtent': int(extent),
                                 'projectWords': {s: sorted(set(a['projectWords'][s] + b['projectWords'][s])) for s in ['K', sig]}})
        pos = mapped.index(a)
        mapped[pos:pos + 2] = replacements


def build(data, reviews, cache):
    for sig, sha in reviews.get('sourceSha256', {}).items():
        assert data['witnesses'][sig]['sha256'] == sha, 'Review source changed: ' + sig
    result = {'version': 2, 'method': cache['provenance']['method'] + '; chapter scope; original source tokens retained',
              'provenance': cache['provenance'], 'chapters': {}, 'reviews': reviews.get('groups', [])}
    counts = {s: dict(words=0, aligned=0, insertions=0, positionedGaps=0, open=0, reviewed=0) for s in ['P', 'C']}
    bridge_counts = {s: dict(projectTokens=0, bridgedProjectTokens=0) for s in ['K', 'P', 'C']}
    for ch, chapter in cache['chapters'].items():
        sigs = ['K', 'P', 'C']
        mappings = {}
        for sig, witness in zip(sigs, chapter['witnesses']):
            assert witness['id'] == data['witnesses'][sig]['id']
            mappings[sig] = bridge(data['witnesses'][sig]['units'], witness['tokens'])
            bridge_counts[sig]['projectTokens'] += len(witness['tokens'])
            bridge_counts[sig]['bridgedProjectTokens'] += sum(bool(mappings[sig].get(t['id'])) for t in witness['tokens'])
        # One source word may span multiple project tokens/expansion columns.
        # Merge those columns globally before rendering any witness to avoid duplicates.
        columns = chapter['columns']
        parent = list(range(len(columns)))
        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i
        owners = {}
        for i, row in enumerate(columns):
            for sig, cell in zip(sigs, row):
                for tid in cell:
                    for ref, index in mappings[sig].get(tid, []):
                        key = (sig, ref, index)
                        if key in owners:
                            parent[find(i)] = find(owners[key])
                        owners[key] = i
        # Components must also be contiguous; otherwise source order could reverse.
        changed = True
        while changed:
            changed = False
            spans = defaultdict(list)
            for i in range(len(columns)):
                spans[find(i)].append(i)
            for indices in spans.values():
                for i in range(indices[0], indices[-1] + 1):
                    if find(i) != find(indices[0]):
                        parent[find(i)] = find(indices[0])
                        changed = True
        groups = defaultdict(lambda: {**{s: set() for s in sigs}, 'ids': {s: set() for s in sigs}, 'incomplete': set()})
        for i, row in enumerate(columns):
            for sig, cell in zip(sigs, row):
                for tid in cell:
                    groups[find(i)]['ids'][sig].add(tid)
                    if not mappings[sig].get(tid):
                        groups[find(i)]['incomplete'].add(sig)
                    groups[find(i)][sig].update(map(tuple, mappings[sig].get(tid, [])))
        ordered = sorted(groups.values(), key=lambda g: min(
            (owners[(s, r, i)] for s in sigs for r, i in g[s]), default=len(columns)))
        base_stream = [(r, i) for r, u in data['witnesses']['K']['units'].items()
                       if r.startswith(ch + ':') for i in range(len(u['words']))]
        base_order = {p: i for i, p in enumerate(base_stream)}
        for sig in ['P', 'C']:
            stream = [(r, i) for r, u in data['witnesses'][sig]['units'].items()
                      if r.startswith(ch + ':') for i in range(len(u['words']))]
            order = {p: i for i, p in enumerate(stream)}
            mapped = []
            previous = None
            for group in ordered:
                base = sorted(group['K'], key=base_order.__getitem__)
                reading = sorted(group[sig], key=order.__getitem__)
                # Keep cross-unit components unresolved instead of inventing anchors.
                if len({r for r, i in base}) > 1:
                    if base:
                        previous = base[-1]
                    continue
                if not base and 'K' in group['incomplete']:
                    continue  # Missing source bridge is not evidence for an addition.
                ref = base[0][0] if base else previous[0] if previous else base_stream[0][0]
                if not base and not reading:
                    continue
                ws = [data['witnesses'][s]['units'][r]['words'][i]
                      for s, pairs in [('K', base), (sig, reading)] for r, i in pairs]
                adjacent_gap = any('□' in neighbour['text']
                    for s, pairs in [('K', base), (sig, reading)] for r, i in pairs
                    for neighbour in data['witnesses'][s]['units'][r]['words'][max(0, i - 1):i + 2])
                kind = 'project' if base and reading else 'absent' if base else 'insertion'
                mapped.append({'ref': ref, 'base': list(map(list, base)), 'reading': list(map(list, reading)),
                               'after': list(previous) if previous else None, 'kind': kind,
                               'checked': False, 'uncertain': adjacent_gap or any(damaged(w) for w in ws) or bool(group['incomplete'] & {'K', sig}),
                               'projectWords': {s: sorted(group['ids'][s]) for s in ['K', sig]},
                               'method': 'Digital Mishnah / CollateX (automated)'})
                if base:
                    previous = base[-1]
            # An empty CollateX cell beside damaged source material is not a
            # secure omission: a missing span may cover more than one base word.
            for pos, link in enumerate(mapped):
                if link['reading']:
                    continue
                before = next((l for l in reversed(mapped[:pos]) if l['reading']), None)
                after = next((l for l in mapped[pos + 1:] if l['reading']), None)
                if any(l and l['uncertain'] for l in [before, after]) or not (before or after):
                    link['uncertain'] = True
            for review in reviews.get('groups', []):
                if review['witness'] != sig or not review['base'][0][0].startswith(ch + ':'):
                    continue
                for s, field in [('K', 'base'), (sig, 'reading')]:
                    assert [data['witnesses'][s]['units'][r]['words'][i]['text'] for r, i in review[field]] == review['expected' + field.title()]
                # A review may only label exactly the pair already produced. Never
                # discard other tokens from a larger automatic group.
                for link in mapped:
                    if link['base'] == review['base'] and link['reading'] == review['reading']:
                        link.update(kind='reviewed', checked=True, reason=review['reason'])
            apply_boundary_reviews(data, sig, ch, mapped, reviews, base_stream, base_order)
            refine_damage_boundaries(data, sig, mapped, base_stream, base_order)
            position_gaps(data['witnesses'][sig]['units'], stream, mapped, base_order)
            used = {tuple(p) for link in mapped for p in link['reading']}
            assert sum(len(l['reading']) for l in mapped) == len(used)
            assert sum(len(l['base']) for l in mapped) == len({tuple(p) for l in mapped for p in l['base']})
            anchored = sorted(((order[tuple(p)], l['ref']) for l in mapped for p in l['reading']))
            opened = []
            cursor = 0
            for j, pair in enumerate(stream):
                if pair in used:
                    continue
                while cursor + 1 < len(anchored) and anchored[cursor + 1][0] <= j:
                    cursor += 1
                near = anchored[cursor][1] if anchored else ch + ':1'
                r, i = pair
                opened.append({'nearRef': near, 'reading': [r, i],
                               'reason': 'damaged' if damaged(data['witnesses'][sig]['units'][r]['words'][i]) else 'source-bridge'})
            result['chapters'].setdefault(ch, {})[sig] = {'links': mapped, 'open': opened}
            totals = counts[sig]
            totals['words'] += len(stream)
            totals['aligned'] += sum(len(l['reading']) for l in mapped if l['base'])
            totals['insertions'] += sum(len(l['reading']) for l in mapped if not l['base'] and l['kind'] != 'source-gap')
            totals['positionedGaps'] += sum(len(l['reading']) for l in mapped if l['kind'] == 'source-gap')
            totals['open'] += len(opened)
            totals['reviewed'] += sum(len(l['reading']) for l in mapped if l['checked'])
    for totals in counts.values():
        assert totals['words'] == totals['aligned'] + totals['insertions'] + totals['positionedGaps'] + totals['open']
    result.update(counts=counts, bridgeCounts=bridge_counts)
    return result
