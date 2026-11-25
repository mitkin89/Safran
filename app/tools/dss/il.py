#!/usr/bin/env python3
"""Interlinear für die biblischen Qumran-Rollen: jedes Wort einer Rolle (Fassung „Qumran-Rollen (ETCBC DSS)“) einem Wort des
Westminster-Textes zuordnen. Maschinell, ohne Handarbeit:
  1. Ähnlichkeit je Wortpaar: gleiche Konsonanten (gleich), gleich ohne die Vokalbuchstaben ו/י (nur Schreibweise),
     gleiches Lemma (andere Form) oder ähnliche Konsonanten (andere Lesart); sonst keine Entsprechung.
  2. Beste Zuordnung in gleicher Reihenfolge (Needleman-Wunsch); Wörter der Rolle ohne Gegenstück = Plus.
  Rekonstruktionen der Herausgeber ([ ]) zählen für die Zuordnung mit, werden aber nicht als Abweichung gewertet.
Ausgabe: qumran-il.js (window.QUMRAN_IL = {Buch: {"Kap:Vers": [[Sigel, [[Wortnummern, Text, Art], …]], …]}});
  Art: 0 = gleich, 1 = andere Schreibweise, 2 = andere Lesart, 3 = rekonstruiert, 4 = Plus (ohne Gegenstück).
Aufruf: python3 -I tools/dss/il.py [Projektordner]"""
import json, re, os, sys, glob, difflib, html as H

proj = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
VT = 'Qumran-Rollen (ETCBC DSS)'
FIN = str.maketrans('ךםןףץ', 'כמנפצ')
cons = lambda s: re.sub(r'[^א-ת]', '', s or '').translate(FIN)
def jsobj(f):
    s = open(os.path.join(proj, f), encoding='utf8').read(); return json.loads(s[s.index('window.'):].split('=', 1)[1].strip().rstrip(';'))
LEM = jsobj('oshb-lemmas.js')

def skel(c):
    """Vergleichsform ohne reine Schreibvarianten: ו/י als Vokalbuchstaben im Wortinneren (כול = כל, חסדיו = חסדו) und die langen
    Endungen der Qumran-Orthographie (-וה, -כה, -מה, -נה statt -ו, -כ, -ם, -ן; הואה/היאה = הוא/היא). Endbuchstaben zählen (עבדו ≠ עבדי, ואומרה ≠ ואמר)."""
    c = re.sub(r'([וכמנ])ה$', r'\1', c) if len(c) > 2 else c
    c = re.sub(r'^(הוא|היא)ה$', r'\1', c)
    return c[:1] + re.sub(r'[וי]', '', c[1:-1]) + c[-1:] if len(c) > 2 else c

def he_words(v):
    out = []
    for m in re.finditer(r'<span class="w" data-l="([^"]*)"[^>]*>(.*?)</span>', v):
        lem = set()
        for p in m.group(1).split('/'):
            n = re.match(r'(\d+)', p.strip())
            if n and n.group(1) in LEM: lem.add(cons(LEM[n.group(1)][0]))
        out.append({'c': cons(H.unescape(re.sub(r'<[^>]+>', '', m.group(2)))), 'lem': lem})
    return out

TOK = re.compile(r'<span class="wq" data-l="([^"]*)"[^>]*>(.*?)</span>|<[^>]+>|[^<]+', re.S)
def q_words(part):
    """Teil eines Verses (eine Rolle) -> Wörter mit Text, Konsonanten, Lemmata und Anteil rekonstruierter Buchstaben"""
    words, cur, depth = [], None, 0
    def flush():
        nonlocal cur
        if cur and cons(cur['t']):
            words.append(cur)
        cur = None
    def add(txt, lem=None):
        nonlocal cur, depth
        if cur is None: cur = {'t': '', 'lem': set(), 'in': 0, 'all': 0}
        if lem is not None: cur['lem'].add(cons(lem))
        for ch in txt:
            if ch == '[': depth += 1
            elif ch == ']': depth = max(0, depth - 1)
            elif 'א' <= ch <= 'ת': cur['all'] += 1; cur['in'] += depth > 0
        cur['t'] += txt
    for m in TOK.finditer(part):
        if m.group(1) is not None: add(H.unescape(m.group(2)), m.group(1)); continue  # Wort mit Lemma
        if m.group(0).startswith('<'): continue  # anderes Tag
        for piece in re.split(r'(\s+)', H.unescape(m.group(0))):
            if not piece: continue
            if piece.isspace(): flush()
            else: add(piece)
    flush()
    for w in words: w['c'] = cons(w['t']); w['rec'] = w['all'] and w['in'] / w['all'] > 0.5
    return words

GOD = {'יהוה', 'אדני', 'אלהים', 'אל', 'יה'}  # Gottesnamen werden in den Rollen oft gegeneinander getauscht
def score(h, q):
    """(Wert, Art) für ein Wortpaar; Art wie in der Ausgabe"""
    if not q['c'] or not h['c']: return -1, 2
    if q['c'] == h['c']: return 3, 0
    if skel(q['c']) == skel(h['c']): return 2.6, 1
    # gleiches Lemma des Hauptworts (andere Form, andere Vorsilbe)
    if h['lem'] & {l for l in q['lem'] if len(l) > 1}: return 1.8, 2
    if re.sub(r'^[ובלכמה]', '', q['c']) in GOD and re.sub(r'^[ובלכמה]', '', h['c']) in GOD: return 1.5, 2
    r = difflib.SequenceMatcher(None, skel(q['c']), skel(h['c'])).ratio()
    if r >= 0.67: return 1.0, 2
    return -1.0, 2  # anderes Wort an derselben Stelle: billiger als Plus + Minus, wird als andere Lesart gezeigt

cat = lambda a, b: {'c': a['c'] + b['c'], 'lem': a['lem'] | b['lem']}
GAP = -0.7
def align(hw, qw):
    """Needleman-Wunsch mit 1:1, 2 hebräische Wörter : 1 Wort der Rolle (עמנו אל / עמנואל) und 1 : 2"""
    n, m = len(hw), len(qw)
    NEG = -1e9
    S = [[NEG] * (m + 1) for _ in range(n + 1)]; B = [[None] * (m + 1) for _ in range(n + 1)]
    S[0][0] = 0
    for i in range(n + 1):
        for j in range(m + 1):
            if i == j == 0: continue
            cands = []
            if i and j: s, k = score(hw[i - 1], qw[j - 1]); cands.append((S[i - 1][j - 1] + s, ('d', k)))
            if i: cands.append((S[i - 1][j] + (GAP * 0.3 if j in (0, m) else GAP), ('u',)))  # hebräisches Wort fehlt (am Rand: Bruchstück)
            if j: cands.append((S[i][j - 1] + GAP, ('l',)))
            if i > 1 and j:
                s, k = score(cat(hw[i - 2], hw[i - 1]), qw[j - 1])
                if s > 2: cands.append((S[i - 2][j - 1] + s + 0.5, ('h2', k)))
            if i and j > 1:
                s, k = score(hw[i - 1], cat(qw[j - 2], qw[j - 1]))
                if s > 2: cands.append((S[i - 1][j - 2] + s + 0.5, ('q2', k)))
            S[i][j], B[i][j] = max(cands, key=lambda x: x[0])
    res = [None] * m; i, j = n, m
    while i > 0 or j > 0:
        b = B[i][j]
        if b[0] == 'd': res[j - 1] = ([i], b[1]); i -= 1; j -= 1
        elif b[0] == 'u': i -= 1
        elif b[0] == 'l': res[j - 1] = ([], 4); j -= 1
        elif b[0] == 'h2': res[j - 1] = ([i - 1, i], b[1]); i -= 2; j -= 1
        else: res[j - 1] = res[j - 2] = ([i], b[1]); i -= 1; j -= 2
    return res

def skey(s):
    m = re.match(r'(\d+)?([A-Za-z/]+)?(\d+)?(.*)$', s)
    return (0 if m.group(1) else 1, int(m.group(1) or 0), (m.group(2) or '').lower(), int(m.group(3) or 0), m.group(4) or '')

out, stat = {}, [0] * 5
for f in sorted(glob.glob(os.path.join(proj, 'bundled', 'own', '*', 'he', VT + '.json'))):
    book = f.split(os.sep)[-3]
    q = json.load(open(f, encoding='utf8'))['text']
    wf = glob.glob(os.path.join(proj, 'bundled', 'own', book, 'he', 'Westminster*.json'))
    if not wf: continue
    w = json.load(open(wf[0], encoding='utf8'))['text']
    bk = {}
    for c, ch in enumerate(q, 1):
        for v, html in enumerate(ch, 1):
            if not html or c > len(w) or v > len(w[c - 1]): continue
            hw = he_words(w[c - 1][v - 1])
            if not hw: continue
            rows = []
            for part in html.split('<br>'):
                m = re.match(r'\s*<b>([^<]+)</b>\s*(.*)$', part, re.S)
                if not m: continue
                qw = q_words(m.group(2))
                if not qw: continue
                segs = []
                for x, (idx, kind) in zip(qw, align(hw, qw)):
                    if x['rec'] and kind in (1, 2): kind = 3
                    if x['rec'] and kind == 0: kind = 3
                    stat[kind] += 1
                    segs.append([idx, x['t'].strip(), kind])
                rows.append([m.group(1), segs])
            if rows: bk['%d:%d' % (c, v)] = rows
    if bk: out[book] = bk
p = os.path.join(proj, 'qumran-il.js')
with open(p, 'w', encoding='utf8') as fo:
    fo.write('// Interlinear der biblischen Qumran-Rollen: Wort der Rolle -> Westminster-Wort (maschinell, tools/dss/il.py); Daten: ETCBC DSS (CC BY-NC 4.0), OSHB (CC BY 4.0)\n')
    fo.write('window.QUMRAN_IL=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('qumran-il.js: %d Bücher, %d Verse, %d Bytes; gleich %d, Schreibweise %d, Lesart %d, rekonstruiert %d, Plus %d' % (
    len(out), sum(len(b) for b in out.values()), os.path.getsize(p), *stat))
