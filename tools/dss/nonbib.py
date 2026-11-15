#!/usr/bin/env python3
"""Nichtbiblische Qumran-Rollen (ETCBC/CACCHT Dead Sea Scrolls, Abegg-Daten, CC BY-NC 4.0) -> Safran.
Die großen Schriften (nach Wortzahl) je als eigenes Buch, alle übrigen nichtbiblischen Rollen je Fundort gesammelt.
Gliederung: Fragment (bei den großen Rollen meist die Kolumne) -> Zeile. Rekonstruktionen in [ ], Korrekturen in ( ) bzw. < >.
Jedes Wort mit Lemma ist ein <span class="wq" data-l="Lemma" data-m="Wortart.Stamm.Zeit.Person.Genus.Numerus.Status"> (Klick: Wortanzeige).
Aufruf: python3 -I nonbib.py <dss-Ordner mit tf/2.0.2> <Safran-Projektordner>"""
import sys, os, re, json, hashlib, bisect, gzip, collections

src, proj = sys.argv[1:3]
T = os.path.join(src, 'tf', '2.0.2') + '/'
TOP = int(os.environ.get('QUMRAN_TOP', '40'))


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


VT = 'Qumran-Rollen, nichtbiblisch (ETCBC DSS)'
SRCURL = 'https://github.com/ETCBC/dss (CC BY-NC 4.0); Daten von Martin G. Abegg Jr., James E. Bowley, Edward M. Cook; Konversion Jarod Jacobs, Martijn Naaijer, Dirk Roorda'
CATS = ['Second Temple', 'Dead Sea Scrolls']

# Bezeichnungen (Siglum -> (englischer Titel, hebräischer Titel)); alles andere: "Qumran <Siglum>"
NAMES = {
    '1QS': ('Community Rule (1QS)', 'סרך היחד'), 'CD': ('Damascus Document (CD)', 'ברית דמשק'),
    '1QM': ('War Scroll (1QM)', 'מגילת המלחמה'), '1QHa': ('Hodayot (1QHa)', 'הודיות'),
    '11Q19': ('Temple Scroll (11Q19)', 'מגילת המקדש'), '11Q20': ('Temple Scroll (11Q20)', 'מגילת המקדש'),
    '1QpHab': ('Pesher Habakkuk (1QpHab)', 'פשר חבקוק'), '1Q20': ('Genesis Apocryphon (1Q20)', 'אפוקריפון בראשית'),
    '11Q10': ('Targum of Job (11Q10)', 'תרגום איוב'), '4Q418': ('Instruction (4Q418)', 'מוסר למבין'),
    '4Q417': ('Instruction (4Q417)', 'מוסר למבין'), '4Q266': ('Damascus Document (4Q266)', 'ברית דמשק'),
    '4Q269': ('Damascus Document (4Q269)', 'ברית דמשק'), '4Q270': ('Damascus Document (4Q270)', 'ברית דמשק'),
    '4Q258': ('Community Rule (4Q258)', 'סרך היחד'), '4Q364': ('Reworked Pentateuch (4Q364)', 'תורה משוכתבת'),
    '4Q365': ('Reworked Pentateuch (4Q365)', 'תורה משוכתבת'), '4Q503': ('Daily Prayers (4Q503)', 'תפילות יומיות'),
    '4Q511': ('Songs of the Sage (4Q511)', 'שירי המשכיל'), '4Q405': ('Songs of the Sabbath Sacrifice (4Q405)', 'שירות עולת השבת'),
    '4Q491': ('War Scroll (4Q491)', 'מגילת המלחמה'), '4Q504': ('Words of the Luminaries (4Q504)', 'דברי המאורות'),
    '4Q525': ('Beatitudes (4Q525)', 'אשרי'), '4Q163': ('Pesher Isaiah (4Q163)', 'פשר ישעיה'),
    '4Q209': ('Astronomical Enoch (4Q209)', 'חנוך האסטרונומי'), '4Q204': ('Book of Enoch (4Q204)', 'ספר חנוך'),
    '4Q216': ('Jubilees (4Q216)', 'ספר היובלים'), '4Q223_224': ('Jubilees (4Q223–224)', 'ספר היובלים'),
}

ot = load(T + 'otype.tf')
NSLOT = sum(1 for v in ot.values() if v == 'sign')
slots = {}; node = NSLOT + 1
lines_ = open(T + 'oslots.tf', encoding='utf8').read().split('\n')
i = 0
while i < len(lines_) and lines_[i].strip() != '': i += 1
for ln in lines_[i + 1:]:
    ln = ln.strip()
    if not ln: continue
    if '\t' in ln: n, rng = ln.split('\t', 1); node = int(n)
    else: rng = ln
    ps = []
    for part in rng.split(','):
        a, _, b = part.partition('-'); ps.append((int(a), int(b or a)))
    slots[node] = ps; node += 1
del lines_

sc = load(T + 'scroll.tf'); fr = load(T + 'fragment.tf'); ln_ = load(T + 'line.tf'); bib = load(T + 'biblical.tf')
full = load(T + 'full.tf'); after = load(T + 'after.tf'); punc = load(T + 'punc.tf')
FEAT = {f: load(T + f + '.tf') for f in ('glex', 'lex', 'sp', 'vt', 'vs', 'ps', 'gn', 'nu', 'st')}


def index(otype, feat):
    r = sorted((slots[n][0][0], slots[n][-1][1], n) for n in feat if ot.get(n) == otype and n in slots)
    return [x[0] for x in r], r


sst, sr = index('scroll', sc); fst, fr_r = index('fragment', fr); lst, lr = index('line', ln_)


def find(st, rr, s):
    k = bisect.bisect_right(st, s) - 1
    return rr[k][2] if k >= 0 and rr[k][1] >= s else None


def clean(f):
    return f.replace('ε', '…').replace('׳', '').replace('#', '').replace('?', '').replace('^', '').replace('\xa0', ' ')


# Wörter je Zeile
words = sorted((slots[n][0][0], n) for n, v in ot.items() if v == 'word' and n in slots)
perline = collections.defaultdict(list)
total = collections.Counter(); bibc = collections.Counter()
for s, w in words:
    l = find(lst, lr, s)
    if l is None: continue
    sn = find(sst, sr, s)
    if sn is None: continue
    perline[(sn, l)].append(w)
    total[sc[sn]] += 1
    if bib.get(w) == '1': bibc[sc[sn]] += 1
nb = {s for s in total if bibc[s] < 0.5 * total[s]}
print(len(nb), 'nichtbiblische Rollen')


def skey(s):
    m = re.match(r'(\d+)?([A-Za-z/]+)?(\d+)?(.*)$', s)
    return (0 if m.group(1) else 1, int(m.group(1) or 0), m.group(2) or '', int(m.group(3) or 0), m.group(4) or '')


def num(x):
    m = re.match(r'(\d+)', x or ''); return (int(m.group(1)) if m else 10 ** 6, x or '')


# Rollen -> Fragmente -> Zeilen
scrolls = collections.defaultdict(lambda: collections.defaultdict(list))
for (sn, l), ws in perline.items():
    s = sc[sn]
    if s not in nb: continue
    f = find(fst, fr_r, slots[ws[0]][0][0])
    scrolls[s][fr.get(f, '?')].append((slots[l][0][0], ln_.get(l, '?'), ws))


SP_SKIP = {'', 'unknown', 'suff'}
OPEN = set('[({<')
CLOSE = set('])}>')


def lemma_of(w):
    g = FEAT['glex'].get(w) or FEAT['lex'].get(w) or ''
    g = g.replace('\uFB2A', '\u05E9').replace('\uFB2B', '\u05E9').replace('\u05E9\u05C1', '\u05E9').replace('\u05E9\u05C2', '\u05E9')
    return re.sub(r'[^\u05D0-\u05EA]', '', g)


def tcode(w):
    g = lambda k: (FEAT[k].get(w) or '-') if (FEAT[k].get(w) or '') not in ('', 'unknown') else '-'
    return '.'.join(g(k) for k in ('sp', 'vs', 'vt', 'ps', 'gn', 'nu', 'st'))


def line_text(ws):
    """Zeile als HTML: jedes Wort mit Lemma ist <span class="wq" data-l="Lemma" data-m="sp.vs.vt.ps.gn.nu.st"> (Klick: Wortanzeige)"""
    out = ''; prev_sp = False
    for w in ws:
        t = clean(full.get(w) or ''); pc = punc.get(w) or ''
        if pc and not t.endswith(pc): t += pc
        t = t.strip()
        if not t: continue
        t = re.sub(r'([\[(<{]) +', r'\1', t); t = re.sub(r' +([\])>}])', r'\1', t)
        t = re.sub(r' +', ' ', t).replace('<', '&lt;').replace('>', '&gt;')
        lem = lemma_of(w); sp = FEAT['sp'].get(w) or ''
        if lem and sp not in SP_SKIP:
            t = '<span class="wq" data-l="%s" data-m="%s">%s</span>' % (lem, tcode(w), t)
        if out and prev_sp: out += ' '
        out += t
        prev_sp = bool(after.get(w))
    return re.sub(r' +', ' ', out).strip()


order = sorted(nb, key=lambda s: -total[s])
big = order[:TOP]
rest = [s for s in nb if s not in big]


def group_of(s):
    m = re.match(r'(\d+)Q', s)
    if m: return 'Cave %s' % m.group(1), int(m.group(1))
    m = re.match(r'(Mas|XHev|Mur|Se|Hev|[A-Za-z]+)', s)
    return 'Other sites', 100


man_p = os.path.join(proj, 'bundled', 'manifest.json')
man = json.load(open(man_p))
man['items'] = [it for it in man['items'] if it['versionTitle'] != VT]
outlines = {}


def write_book(title, hetitle, secs, outline=None):
    d = {'title': title, 'heTitle': hetitle, 'language': 'Hebrew', 'versionTitle': VT, 'versionSource': SRCURL,
         'sectionNames': ['Fragment', 'Line'], 'text': secs}
    rel = 'own/%s/he/%s.json' % (title, VT)
    p = os.path.join(proj, 'bundled', rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    raw = json.dumps(d, ensure_ascii=False); open(p, 'w', encoding='utf8').write(raw)
    man['items'].append({'rel': rel, 'title': title, 'heTitle': hetitle, 'language': 'Hebrew', 'versionTitle': VT,
                         'categories': CATS, 'kind': 'he', 'hash': hashlib.sha1(raw.encode()).hexdigest()})
    if outline: outlines[title] = outline
    print(title, len(secs), 'Fragmente', sum(len(x) for x in secs), 'Zeilen')


for s in sorted(big, key=skey):
    en, he = NAMES.get(s, ('Qumran %s' % s, s))
    secs = []
    for f in sorted(scrolls[s], key=num):
        rows = sorted(scrolls[s][f], key=lambda r: r[0])
        secs.append(['<b>%s</b> %s' % (r[1], line_text(r[2])) for r in rows])
        
    write_book(en, he, secs)

groups = collections.defaultdict(list)
for s in rest:
    g, k = group_of(s); groups[(k, g)].append(s)
for (k, g), ss in sorted(groups.items()):
    title = 'Qumran, further non-biblical scrolls, %s' % g
    secs, items = [], []
    for s in sorted(ss, key=skey):
        for f in sorted(scrolls[s], key=num):
            rows = sorted(scrolls[s][f], key=lambda r: r[0])
            if not rows: continue
            if not any(it.get('s') == s for it in items): items.append({'s': s, 'ref': '%d:1' % (len(secs) + 1), 'text': '%s' % s})
            secs.append(['<b>%s %s:%s</b> %s' % (s, f, r[1], line_text(r[2])) for r in rows])
            
    outline = {'book': title, 'title': title, 'note': 'Gliederung nach den Sigeln der Rollen; Abschnitt = Fragment.',
               'sections': [{'head': g, 'items': [{'ref': it['ref'], 'text': it['text']} for it in items]}]}
    write_book(title, 'מגילות קומראן נוספות', secs, outline=outline)

json.dump(man, open(man_p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
for t, o in outlines.items():
    json.dump(o, open(os.path.join(proj, 'outlines', t + '.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
