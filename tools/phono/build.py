#!/usr/bin/env python3
"""Phonetische Umschrift des Tanach (ETCBC phono, Dirk Roorda; BHSA 2021, MIT) für Safran.
Je Vers werden die BHSA-Wörter zu Schreibwörtern zusammengefasst (Wortteile ohne Zwischenraum, z. B. בְּ + רֵאשִׁית -> bᵊrēšˌîṯ)
und den Wörtern des Westminster-Textes (OSHB) zugeordnet: gleiche Konsonanten, sonst ähnliche (Ketiv/Qere: das vokalisierte Qere
bekommt die Aussprache, das unvokalisierte Ketiv bleibt leer). Ergebnis:
  1. eine eigene Fassung je Buch: bundled/own/<Buch>/other/Umschrift (ETCBC phono).json (Kind „other“, lateinische Schrift)
  2. die Wortzuordnung für das Interlinear: tools/interlinear/phono/<Buch>.txt (Format wie Zunz; build.py baut daraus interlin/<Buch>.js)
Aufruf: python3 -I tools/phono/build.py <phono-Ordner (Repo ETCBC/phono)> <bhsa-Ordner (Repo ETCBC/bhsa, tf/2021)> [Projektordner]"""
import sys, os, re, json, glob, hashlib, difflib, bisect
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tfload import load, oslots

phono_dir, bhsa_dir = sys.argv[1:3]
proj = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
P = os.path.join(phono_dir, 'tf', '2021') + '/'
B = os.path.join(bhsa_dir, 'tf', '2021') + '/'
VT = 'Umschrift (ETCBC phono)'
SRC = 'https://github.com/ETCBC/phono (MIT); Phono: Dirk Roorda; Daten: BHSA 2021, Constantijn Sikkel (ETCBC)'
BOOKS = {'Genesis': 'Genesis', 'Exodus': 'Exodus', 'Leviticus': 'Leviticus', 'Numeri': 'Numbers', 'Deuteronomium': 'Deuteronomy', 'Josua': 'Joshua',
         'Judices': 'Judges', 'Samuel_I': 'I Samuel', 'Samuel_II': 'II Samuel', 'Reges_I': 'I Kings', 'Reges_II': 'II Kings', 'Jesaia': 'Isaiah',
         'Jeremia': 'Jeremiah', 'Ezechiel': 'Ezekiel', 'Hosea': 'Hosea', 'Joel': 'Joel', 'Amos': 'Amos', 'Obadia': 'Obadiah', 'Jona': 'Jonah',
         'Micha': 'Micah', 'Nahum': 'Nahum', 'Habakuk': 'Habakkuk', 'Zephania': 'Zephaniah', 'Haggai': 'Haggai', 'Sacharia': 'Zechariah',
         'Maleachi': 'Malachi', 'Psalmi': 'Psalms', 'Iob': 'Job', 'Proverbia': 'Proverbs', 'Ruth': 'Ruth', 'Canticum': 'Song of Songs',
         'Ecclesiastes': 'Ecclesiastes', 'Threni': 'Lamentations', 'Esther': 'Esther', 'Daniel': 'Daniel', 'Esra': 'Ezra', 'Nehemia': 'Nehemiah',
         'Chronica_I': 'I Chronicles', 'Chronica_II': 'II Chronicles'}
FIN = str.maketrans('ךםןףץ', 'כמנפצ')
cons = lambda s: re.sub(r'[^א-ת]', '', s or '').translate(FIN)

ot = load(B + 'otype.tf')
rng = {}
for k, v in ot.items(): rng.setdefault(v, [k, k]); rng[v][1] = max(rng[v][1], k)
NW = rng['word'][1]
OS = oslots(B + 'oslots.tf', NW + 1)
book, chap, verse = load(B + 'book.tf'), load(B + 'chapter.tf'), load(B + 'verse.tf')
gcons, trail = load(B + 'g_cons_utf8.tf'), load(B + 'trailer_utf8.tf')
ph, pht = load(P + 'phono.tf'), load(P + 'phono_trailer.tf')

def nodes(t): return range(rng[t][0], rng[t][1] + 1) if t in rng else []

# Vers -> Schreibwörter [(Konsonanten, Umschrift)]
data = {}
for vn in nodes('verse'):
    b, c, v = BOOKS.get(book.get(vn)), chap.get(vn), verse.get(vn)
    if not b or not c or not v: continue
    a, e = OS[vn]
    ws, cur_c, cur_p = [], '', ''
    for w in range(a, e + 1):
        cur_c += cons(gcons.get(w, '')); cur_p += ph.get(w, '') + (pht.get(w, '') if not trail.get(w) else '')
        if trail.get(w):  # Ende des Schreibworts: Leerzeichen, Maqqef, Sof Pasuq …
            if cur_c or cur_p: ws.append((cur_c, cur_p.strip()))
            cur_c, cur_p = '', ''
    if cur_c or cur_p: ws.append((cur_c, cur_p.strip()))
    data.setdefault(b, {})[(int(c), int(v))] = ws

POINTS = re.compile(r'[ְ-ׇּׁׂ]')
def he_words(html):
    out = []
    for m in re.finditer(r'<span class="w"[^>]*>(.*?)</span>', html):
        t = re.sub(r'<[^>]+>', '', m.group(1))
        out.append({'c': cons(t), 'k': not POINTS.search(t)})  # k: ohne Vokale = Ketiv
    return out

def score(h, q):
    if h['c'] == q:
        return 0.6 if h['k'] else 3
    r = difflib.SequenceMatcher(None, h['c'], q).ratio() if h['c'] and q else 0
    if r >= 0.6: return 0.4 if h['k'] else 1 + r
    return -1

GAP = -0.7
def align(hw, qw):
    n, m = len(hw), len(qw)
    S = [[0.0] * (m + 1) for _ in range(n + 1)]; Bk = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1): S[i][0] = S[i - 1][0] + (0 if hw[i - 1]['k'] else GAP); Bk[i][0] = 1
    for j in range(1, m + 1): S[0][j] = S[0][j - 1] + GAP; Bk[0][j] = 2
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d = S[i - 1][j - 1] + score(hw[i - 1], qw[j - 1][0])
            u = S[i - 1][j] + (0 if hw[i - 1]['k'] else GAP)  # Ketiv ohne eigene Aussprache: kostet nichts
            l = S[i][j - 1] + GAP
            S[i][j], Bk[i][j] = max((d, 0), (u, 1), (l, 2))
    res = [None] * m; i, j = n, m
    while i > 0 or j > 0:
        b = Bk[i][j] if i > 0 and j > 0 else (1 if j == 0 else 2)
        if b == 0:
            res[j - 1] = [i] if score(hw[i - 1], qw[j - 1][0]) > 0 else []; i -= 1; j -= 1
        elif b == 1: i -= 1
        else: res[j - 1] = []; j -= 1
    return res

man_p = os.path.join(proj, 'bundled', 'manifest.json')
man = json.load(open(man_p, encoding='utf8'))
man['items'] = [it for it in man['items'] if it['versionTitle'] != VT]
meta = {}
for it in man['items']: meta.setdefault(it['title'], it)
ildir = os.path.join(proj, 'tools', 'interlinear', 'phono'); os.makedirs(ildir, exist_ok=True)
tot = unmatched = 0
for title in BOOKS.values():
    wf = glob.glob(os.path.join(proj, 'bundled', 'own', title, 'he', 'Westminster*.json'))
    if not wf or title not in data: print('fehlt', title); continue
    W = json.load(open(wf[0], encoding='utf8'))['text']
    text, lines = [], []
    for c, ch in enumerate(W, 1):
        row = []
        for v, html in enumerate(ch, 1):
            qw = data[title].get((c, v))
            if not qw: row.append(''); continue
            hw = he_words(html)
            idx = align(hw, qw)
            segs = [(ix, p) for (cc, p), ix in zip(qw, idx) if p]
            tot += len(segs); unmatched += sum(1 for ix, _ in segs if not ix)
            row.append(' '.join(p for _, p in segs))
            lines.append('%d:%d\t%s' % (c, v, ' | '.join('%s:%s' % (','.join(map(str, ix)) if ix else '-', p) for ix, p in segs)))
        text.append(row)
    he = meta.get(title, {})
    d = {'title': title, 'heTitle': he.get('heTitle', title), 'language': 'Transliteration', 'versionTitle': VT, 'versionSource': SRC,
         'sectionNames': ['Chapter', 'Verse'], 'text': text}
    rel = 'own/%s/other/%s.json' % (title, VT)
    p = os.path.join(proj, 'bundled', rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    raw = json.dumps(d, ensure_ascii=False, separators=(',', ':')); open(p, 'w', encoding='utf8').write(raw)
    man['items'].append({'rel': rel, 'title': title, 'heTitle': d['heTitle'], 'language': 'Transliteration', 'versionTitle': VT,
                         'categories': he.get('categories', ['Tanakh']), 'kind': 'other', 'hash': hashlib.sha1(raw.encode()).hexdigest()})
    open(os.path.join(ildir, title + '.txt'), 'w', encoding='utf8').write('\n'.join(lines) + '\n')
json.dump(man, open(man_p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('Umschrift: %d Wörter, davon %d ohne Gegenstück im Westminster-Text' % (tot, unmatched))
