#!/usr/bin/env python3
"""DT-UCPH/sp Text-Fabric 7.5.0 -> five Safran editions and popup data.
Usage: python3 -I tools/samaritan/build.py /path/to/sp-source
Input includes upstream.json (repository, pinned commit, version), LICENSE,
textual_issues/issues.json, and tf/7.5.0/*.tf. No network access at build time.
"""
import bisect, collections, hashlib, html, json, pathlib, re, sys, unicodedata
ROOT = pathlib.Path(__file__).resolve().parents[2]
VERSION = '7.5.0'
VT = 'Samaritanischer Pentateuch (CACCHT, DT-UCPH 7.5.0)'
FIELDS = 'lex_utf8 gloss sp vs vt ps gn nu prs_ps prs_gn prs_nu'.split()
FILES = 'book chapter verse otype oslots sign g_cons_utf8 lex lex_utf8 gloss sp vs vt ps gn nu prs_ps prs_gn prs_nu trailer g_prs_utf8 phono_transcr grammar_note var_ft_utf8 var_ft_span var_ft_type verse_ft ETCBC_parsing'.split()

def norm(s):
    # Unicode presentation forms (e.g. שׁ) only; no spelling corrections.
    return unicodedata.normalize('NFKC', s)

def feature(path):
    text = path.read_text(encoding='utf8')
    body = text.split('\n\n', 1)[1]
    result = {}; node = 0
    for line in body.splitlines():
        bits = line.split('\t')
        if len(bits) > 1:
            nodes, value = bits[0], '\t'.join(bits[1:])
            chunks = nodes.split(',')
            for chunk in chunks:
                limits = chunk.split('-'); lo = int(limits[0]); hi = int(limits[-1])
                for node in range(lo, hi + 1): result[node] = value
        else:
            node += 1; result[node] = bits[0]
    return result

def bounds(value):
    ranges = [tuple(map(int, (x.split('-') if '-' in x else [x, x]))) for x in value.split(',')]
    assert all(a <= b for a, b in ranges)
    # Reading order is contiguous in this pinned corpus.
    assert all(ranges[i][1] + 1 == ranges[i+1][0] for i in range(len(ranges)-1))
    return ranges[0][0], ranges[-1][1]

def packed(a):
    while a and not a[-1]: a.pop()
    return a

def build(src):
    source = json.loads((src/'upstream.json').read_text())
    assert source['version'] == VERSION
    assert re.fullmatch(r'[0-9a-f]{40}', source['commit'])
    old = ROOT/'tools/samaritan/source.json'
    paths = [f'tf/{VERSION}/{f}.tf' for f in FILES] + ['LICENSE', 'textual_issues/issues.json']
    hashes = {p: hashlib.sha256((src/p).read_bytes()).hexdigest() for p in paths}
    if old.exists():
        locked = json.loads(old.read_text())
        assert locked['commit'] == source['commit'] and locked['sha256'] == hashes, 'Source revision/checksums differ from source.json'
    fs = {f: feature(src/f'tf/{VERSION}/{f}.tf') for f in FILES}
    types, slots = fs['otype'], fs['oslots']
    bs = {n: bounds(v) for n, v in slots.items() if types[n] in {'book','chapter','verse','word'}}
    words = [n for n in bs if types[n] == 'word']; starts = [bs[n][0] for n in words]
    books = [n for n in bs if types[n] == 'book']; chapters = [n for n in bs if types[n] == 'chapter']
    verses = [n for n in bs if types[n] == 'verse']
    signs = fs['sign']
    def text(lo, hi): return norm(''.join(signs[n] for n in range(lo, hi+1)))
    def container(nodes, start):
        matches = [n for n in nodes if bs[n][0] <= start <= bs[n][1]]
        assert len(matches) == 1
        return matches[0]
    lexicon = []; lexids = {}; tokens = {}; variants = []; counts = collections.Counter(); verse_hashes = {}
    out = {fs['book'][b]: [] for b in books}
    issues = json.loads((src/'textual_issues/issues.json').read_text())
    all_issues = collections.defaultdict(list)
    for issue in issues.values():
        sec = issue['section']; all_issues[tuple(sec)].append('Hinweis der Datenquelle ('+issue['data_version']+'): '+issue['explanation'])
    for vn in verses:
        lo, hi = bs[vn]; bn = container(books, lo); cn = container(chapters, lo)
        book, ch, verse = fs['book'][bn], int(fs['chapter'][cn]), int(fs['verse'][vn])
        ref = f'{book} {ch}:{verse}'; nodes = words[bisect.bisect_left(starts, lo):bisect.bisect_right(starts, hi)]
        assert nodes and bs[nodes[0]][0] == lo and bs[nodes[-1]][1] == hi, ref
        groups = []; current = []
        for n in nodes:
            current.append(n)
            if fs['trailer'].get(n, '') or n == nodes[-1]: groups.append(current); current = []
        assert not current
        group_of = {n: gi for gi, g in enumerate(groups) for n in g}
        var_end = collections.defaultdict(list); var_start = collections.defaultdict(list)
        for n in nodes:
            if n not in fs['var_ft_utf8']: continue
            span = int(fs['var_ft_span'][n]); end = n + max(span, 1) - 1
            assert end in group_of and (not span or groups[group_of[n]][0] == n), (ref,n,span)
            assert groups[group_of[end]][-1] == end, (ref,n,span,'not a graphic word boundary')
            base = text(bs[n][0], bs[end][1]).strip() if span else ''
            v = {'ref': ref, 'node': n, 'span': span, 'base': base,
                 'reading': norm(fs['var_ft_utf8'][n]), 'type': fs['var_ft_type'][n]}
            if vn in fs['verse_ft']: v['verseFT'] = fs['verse_ft'][vn]
            vid = len(variants); variants.append(v)
            var_start[group_of[n]].append(vid); var_end[group_of[end]].append(vid)
        rendered = []; note_num = 0; original = text(lo, hi)
        for gi, group in enumerate(groups):
            start, end = bs[group[0]][0], bs[group[-1]][1]
            raw = text(start,end); trailing = re.search(r'\s*$', raw).group(); surface = raw[:-len(trailing)] if trailing else raw
            indices = []; phono = []; notes = []
            for n in group:
                sig = tuple(norm(fs[f].get(n,'')) for f in FIELDS)
                if sig not in lexids: lexids[sig] = len(lexicon); lexicon.append(list(sig))
                indices.append(lexids[sig]); counts['morphemes'] += 1
                phono.append(fs['phono_transcr'].get(n,''))
                if fs['grammar_note'].get(n): notes.append(fs['grammar_note'][n])
            token = packed([indices, phono if any(phono) else [], list(dict.fromkeys(notes)), var_start[gi]])
            sid = str(group[0]); tokens[sid] = token; counts['words'] += 1
            rendered.append(f'<span class="w" data-l="sp:{sid}" data-m="">{html.escape(surface)}</span>')
            for vid in var_end[gi]:
                v = variants[vid]; note_num += 1
                reading = 'ausgelassen' if v['reading'] == '-' else v['reading']
                label = ('Zusatz nach '+surface if not v['span'] else v['base']) + ' — Tal–Florentin: '+reading
                if v.get('verseFT'): label += ' (dort '+v['verseFT']+')'
                rendered.append(f'<sup class="footnote-marker">{note_num}</sup><i class="footnote">{html.escape(label)}</i>')
            rendered.append(html.escape(trailing))
        for msg in all_issues.get((book,ch,verse),[]):
            note_num += 1; rendered.append(f'<sup class="footnote-marker">{note_num}</sup><i class="footnote">{html.escape(msg)}</i>')
        marked = ''.join(rendered).strip()
        visible = re.sub(r'<sup class="footnote-marker">.*?</sup><i class="footnote">.*?</i>', '', marked)
        visible = html.unescape(re.sub(r'<[^>]+>', '', visible))
        assert visible.strip() == original.strip(), (ref,visible,original)
        arr = out[book]
        while len(arr) < ch: arr.append([])
        while len(arr[ch-1]) < verse: arr[ch-1].append('')
        assert not arr[ch-1][verse-1], ref
        arr[ch-1][verse-1] = marked
        verse_hashes[ref] = hashlib.sha256(original.strip().encode()).hexdigest(); counts['verses'] += 1
    assert len(variants) == 1074
    manifest_path = ROOT/'bundled/manifest.json'; manifest = json.loads(manifest_path.read_text())
    manifest['items'] = [i for i in manifest['items'] if i['versionTitle'] != VT]
    source_url = source['repository']+'/tree/'+source['commit']
    source['sha256'] = hashes; source['counts'] = dict(counts); source['variants'] = len(variants)
    source['fields'] = FIELDS; source['verseHashes'] = verse_hashes
    for book, arr in out.items():
        template = next(i for i in manifest['items'] if i['title']==book and i['kind']=='he')
        doc = {'title':book,'heTitle':template['heTitle'],'language':'Hebrew','versionTitle':VT,
               'versionSource':source_url+' (CC BY-NC 4.0); Christian Canu Højgaard, Martijn Naaijer, Stefan Schorch; Dublin CBL 751 + Garizim 1; Tal–Florentin-Lesarten als Anmerkungen.',
               'license':'CC BY-NC 4.0','licenseUrl':'https://creativecommons.org/licenses/by-nc/4.0/',
               'sectionNames':['Chapter','Verse'],'text':arr}
        rel=f'own/{book}/he/{VT}.json'; raw=json.dumps(doc,ensure_ascii=False,separators=(',',':')).encode()
        (ROOT/'bundled'/rel).write_bytes(raw)
        manifest['items'].append({k:doc[k] for k in ['title','heTitle','language','versionTitle','versionSource']} | {'rel':rel,'categories':template['categories'],'kind':'he','hash':hashlib.sha1(raw).hexdigest()})
        print(book,len(arr),sum(len(c) for c in arr),'verses')
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')))
    data = {'version':VERSION,'source':source_url,'fields':FIELDS,'lexicon':lexicon,'words':tokens,'variants':variants}
    payload=json.dumps(data,ensure_ascii=False,separators=(',',':'))
    (ROOT/'samaritan-data.js').write_text('// Generated by tools/samaritan/build.py; DT-UCPH/sp, CC BY-NC 4.0.\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else window.SAMARITAN_DATA=d;})('+payload+');\n')
    old.write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'licenses').mkdir(exist_ok=True)
    (ROOT/'licenses/samaritan-CC-BY-NC-4.0.txt').write_bytes((src/'LICENSE').read_bytes())
    print(dict(counts),'variants',len(variants),'lexicon',len(lexicon),'data bytes',len(payload.encode()))

if __name__ == '__main__': build(pathlib.Path(sys.argv[1]))
