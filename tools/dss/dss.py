#!/usr/bin/env python3
"""Qumran-Bibelrollen (ETCBC/CACCHT Dead Sea Scrolls, Abegg-Daten, CC BY-NC 4.0) -> Safran.
Pro Tanach-Buch eine hebräische Version „Qumran-Rollen (ETCBC DSS)“: Je Vers stehen alle Rollen, die den Vers (teilweise) enthalten, mit ihrer Sigle.
Aufruf: python3 -I dss.py <dss-Ordner mit tf/2.0.2> <Safran-Projektordner>
Jedes Wort mit Lemma ist wie bei den nichtbiblischen Rollen (nonbib.py) ein <span class="wq" data-l="Lemma" data-m="Wortart.Stamm.Zeit.Person.Genus.Numerus.Status[.Suffix]"> (Klick: Wortanzeige).
Nur Bibelrollen mit echter Kapitel-/Versangabe; Lesetext: Rekonstruktionen in [ ], Korrekturen in ( ) bzw. < >; Unsicherheitszeichen entfallen."""
import sys, os, re, json, hashlib, bisect, collections
src, proj = sys.argv[1:3]


def load(path):
    out = {}
    lines = open(path, encoding='utf8').read().split('\n')
    i = 0
    while i < len(lines) and lines[i].strip() != '': i += 1
    node = 0
    for ln in lines[i + 1:]:
        if ln == '': continue
        if '\t' in ln:
            a, v = ln.split('\t', 1)
            if re.fullmatch(r'[\d,\-]+', a):
                nodes = []
                for p in a.split(','):
                    x, _, y = p.partition('-'); nodes += range(int(x), int(y or x) + 1)
                for n in nodes: out[n] = v
                node = nodes[-1]
                continue
            node += 1; out[node] = v
        else:
            node += 1; out[node] = ln
    return out


T = os.path.join(src, 'tf', '2.0.2') + '/'
BOOKS = {'Gen': 'Genesis', 'Ex': 'Exodus', 'Lev': 'Leviticus', 'Num': 'Numbers', 'Deut': 'Deuteronomy', 'Josh': 'Joshua', 'Judg': 'Judges', '1Sam': 'I Samuel', '2Sam': 'II Samuel',
         '1Kgs': 'I Kings', '2Kgs': 'II Kings', 'Is': 'Isaiah', 'Jer': 'Jeremiah', 'Ezek': 'Ezekiel', 'Hos': 'Hosea', 'Joel': 'Joel', 'Amos': 'Amos', 'Obad': 'Obadiah', 'Jonah': 'Jonah',
         'Mic': 'Micah', 'Nah': 'Nahum', 'Hab': 'Habakkuk', 'Zeph': 'Zephaniah', 'Hag': 'Haggai', 'Zech': 'Zechariah', 'Mal': 'Malachi', 'Ps': 'Psalms', 'Prov': 'Proverbs', 'Job': 'Job',
         'Song': 'Song of Songs', 'Ruth': 'Ruth', 'Lam': 'Lamentations', 'Eccl': 'Ecclesiastes', 'Dan': 'Daniel', 'Ezra': 'Ezra', 'Neh': 'Nehemiah', '1Chr': 'I Chronicles', '2Chr': 'II Chronicles', 'Esth': 'Esther'}
VT = 'Qumran-Rollen (ETCBC DSS)'
SRCURL = 'https://github.com/ETCBC/dss (CC BY-NC 4.0); Daten von Martin G. Abegg Jr., James E. Bowley, Edward M. Cook; Konversion Jarod Jacobs, Martijn Naaijer, Dirk Roorda'
NSLOT = sum(1 for v in load(T + 'otype.tf').values() if v == 'sign')
ot = load(T + 'otype.tf')
slots = {}; node = NSLOT + 1
lines = open(T + 'oslots.tf', encoding='utf8').read().split('\n')
i = 0
while i < len(lines) and lines[i].strip() != '': i += 1
for ln in lines[i + 1:]:
    ln = ln.strip()
    if not ln: continue
    if '\t' in ln: n, rng = ln.split('\t', 1); node = int(n)
    else: rng = ln
    ps = []
    for part in rng.split(','):
        a, _, b = part.partition('-'); ps.append((int(a), int(b or a)))
    slots[node] = ps; node += 1
sc = load(T + 'scroll.tf')
scn = sorted((slots[n][0][0], slots[n][-1][1], n) for n in sc if ot.get(n) == 'scroll' and n in slots)
st = [x[0] for x in scn]
def scroll_of(w):
    s = slots[w][0][0]; k = bisect.bisect_right(st, s) - 1
    return sc[scn[k][2]] if k >= 0 and scn[k][1] >= s else None
book = load(T + 'book.tf'); chap = load(T + 'chapter.tf'); verse = load(T + 'verse.tf'); full = load(T + 'full.tf'); after = load(T + 'after.tf'); punc = load(T + 'punc.tf')
FEAT = {f: load(T + f + '.tf') for f in ('glex', 'lex', 'sp', 'vt', 'vs', 'ps', 'gn', 'nu', 'st', 'morpho', 'ps2', 'gn2', 'nu2')}
SP_MORPHO = {'n': 'subs', 'v': 'verb', 'P': 'ptcl', 'a': 'adjv', 'u': 'numr', 'p': 'pron'}
def sp_of(w):
    sp = FEAT['sp'].get(w) or ''
    return SP_MORPHO.get((FEAT['morpho'].get(w) or '')[:1], '') if sp == 'suff' else sp
def lemma_of(w):
    g = FEAT['glex'].get(w) or FEAT['lex'].get(w) or ''
    g = g.replace('\uFB2A', '\u05E9').replace('\uFB2B', '\u05E9').replace('\u05E9\u05C1', '\u05E9').replace('\u05E9\u05C2', '\u05E9')
    return re.sub(r'[^\u05D0-\u05EA]', '', g)
def tcode(w):
    g = lambda k: (FEAT[k].get(w) or '-') if (FEAT[k].get(w) or '') not in ('', 'unknown') else '-'
    sx = ''.join(FEAT[k].get(w) or '' for k in ('ps2', 'gn2', 'nu2')) if FEAT['sp'].get(w) == 'suff' else ''
    return '.'.join([sp_of(w) or '-'] + [g(k) for k in ('vs', 'vt', 'ps', 'gn', 'nu', 'st')] + ([sx] if sx else []))
def clean(f):
    f = f.replace('ε', '…').replace('׳', '').replace('#', '').replace('?', '').replace('^', '').replace('\xa0', ' ')
    return f
data = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(list)))  # Buch -> (Kap,Vers) -> Rolle -> [(Pos, Text)]
for w, b in book.items():
    if b not in BOOKS or ot.get(w) != 'word' or w not in slots: continue
    c, v = chap.get(w), verse.get(w)
    if not (c and v and c.isdigit() and v.isdigit()): continue
    s = scroll_of(w)
    if not s: continue
    t = clean(full.get(w) or ''); pc = punc.get(w) or ''
    if pc and not t.endswith(pc): t += pc
    if not t.strip(): continue
    t = t.replace('<', '&lt;').replace('>', '&gt;')
    lem = lemma_of(w); sp = sp_of(w)
    if lem and sp and sp != 'unknown':  # Leerzeichen am Rand bleiben außerhalb des <span> (wie bisher für die Zusammensetzung des Lesetexts)
        m = re.match(r'^(\s*)(.*?)(\s*)$', t, re.S); t = '%s<span class="wq" data-l="%s" data-m="%s">%s</span>%s' % (m.group(1), lem, tcode(w), m.group(2), m.group(3))
    data[BOOKS[b]][(int(c), int(v))][s].append((slots[w][0][0], t + (' ' if after.get(w) else '')))
def skey(s):
    m = re.match(r'(\d+)?([A-Za-z/]+)?(\d+)?(.*)$', s)
    return (0 if m.group(1) else 1, int(m.group(1) or 0), m.group(2) or '', int(m.group(3) or 0), m.group(4) or '')
man_p = os.path.join(proj, 'bundled', 'manifest.json')
man = json.load(open(man_p)) if os.path.exists(man_p) else {'version': 1, 'items': []}
meta = {}
for it in json.load(open(os.path.join(proj, 'bundled', 'manifest.json')))['items']: meta.setdefault(it['title'], it)
man['items'] = [it for it in man['items'] if it['versionTitle'] != VT]
for title, vv in sorted(data.items()):
    chs = {}
    for (c, v), rolls in vv.items():
        parts = []
        for s in sorted(rolls, key=skey):
            txt = re.sub(r'\s+', ' ', ''.join(t for _, t in sorted(rolls[s]))).strip()
            # Leerzeichen innen an Klammern weg, auch wenn ein Wort-<span> dazwischen steht („<“ und „>“ im Text sind schon je Wort maskiert)
            txt = re.sub(r'([\[({]|&lt;)(</span>)? ', r'\1\2', txt); txt = re.sub(r' (<span [^>]*>)?([\])}]|&gt;)', r'\1\2', txt)
            if txt: parts.append('<b>%s</b> %s' % (s, txt))
        if parts: chs.setdefault(c, {})[v] = '<br>'.join(parts)
    arr = []
    for c in range(1, max(chs) + 1):
        vs = chs.get(c, {}); n = max(vs) if vs else 0
        arr.append([vs.get(x, '') for x in range(1, n + 1)])
    he = meta.get(title, {})
    d = {'title': title, 'heTitle': he.get('heTitle', title), 'language': 'Hebrew', 'versionTitle': VT, 'versionSource': SRCURL, 'sectionNames': ['Chapter', 'Verse'], 'text': arr}
    rel = 'own/%s/he/%s.json' % (title, VT)
    p = os.path.join(proj, 'bundled', rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    raw = json.dumps(d, ensure_ascii=False); open(p, 'w', encoding='utf8').write(raw)
    man['items'].append({'rel': rel, 'title': title, 'heTitle': d['heTitle'], 'language': 'Hebrew', 'versionTitle': VT,
                         'categories': he.get('categories', ['Tanakh']), 'kind': 'he', 'hash': hashlib.sha1(raw.encode()).hexdigest()})
    print(title, len(arr), 'Kapitel', sum(1 for r in arr for x in r if x), 'Verse', '' if he else '(!) nicht im Manifest')
json.dump(man, open(man_p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
