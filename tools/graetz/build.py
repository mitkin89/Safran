# Graetz, Geschichte der Juden (zeno.org) -> Safran-Text + Gliederung
import json, re, html, hashlib, unicodedata, urllib.parse, sys
D = json.load(open('tree.json')); order, tree = D['order'], D['tree']
ROOT = '/Geschichte/M/Graetz,+Heinrich/Geschichte+der+Juden'
raw = lambda p: open('raw/' + hashlib.md5(p.encode()).hexdigest() + '.html', encoding='utf-8').read()
name = lambda p: urllib.parse.unquote_plus(p.rsplit('/', 1)[1]).strip('[]').replace('] ', ' ').replace('[', '')

ROM = {1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI'}
def band(code):
    return {'021': 'II/1', '026': 'II/2', '031': 'III/1', '036': 'III/2'}.get(code, ROM.get(int(code[:2]), code))

# --- Hebräisch: zeno speichert hebräische Wortgruppen in Sehreihenfolge (links->rechts) -> umkehren
HEB = '֐-׿יִ-ﭏ'
RUN = re.compile(r'[' + HEB + r'](?:[' + HEB + r'\s"\'״׳\-־.,:;()\[\]]*[' + HEB + r'])?')
MIRROR = str.maketrans('()[]', ')(][')
def fix_run(s):
    # in Grapheme zerlegen (Buchstabe + folgende Zeichen der Kategorie Mn), Reihenfolge umkehren, Klammern spiegeln
    g = []
    for ch in s:
        if g and unicodedata.category(ch) == 'Mn': g[-1] += ch
        else: g.append(ch)
    return ''.join(reversed(g)).translate(MIRROR)
FIN, NONFIN = set('ךםןףץ'), set('כמנפצ')
def evidence(run):
    """>0: Sehreihenfolge (umzudrehen), <0: schon richtig, 0: unklar"""
    v = 0
    for w in re.findall(r'[\u05D0-\u05EA]+', run):
        if len(w) < 2: continue
        if w[0] in FIN: v += 1
        if w[-1] in FIN: v -= 1
        if w[-1] in NONFIN: v += 1
        if any(c in FIN for c in w[1:-1]): v += 1
    return v
FREQ = None  # Wortliste aus eindeutigen Gruppen (zweiter Durchlauf)
def orient(run):
    e = evidence(run)
    if e: return e > 0
    if FREQ:
        import math
        ws = re.findall(r'[\u05D0-\u05EA]+', run)
        a = sum(math.log(1 + FREQ.get(w, 0)) for w in ws); b = sum(math.log(1 + FREQ.get(w[::-1], 0)) for w in ws)
        if a != b: return b > a
    return True  # zeno speichert überwiegend in Sehreihenfolge
def fix_hebrew(text):
    out = []; pos = 0
    for m in RUN.finditer(text):
        run = m.group(0); rev = orient(run)
        seg = fix_run(run) if rev else run
        pre = text[pos:m.start()]
        if rev:  # Satzzeichen, die links vor der Gruppe standen, ans Ende
            mm = re.search(r'(^|[\s(»„"])([.,:;!?]+)$', pre)
            if mm: pre = pre[:mm.start(2)]; seg = seg + mm.group(2)
        out.append(pre + seg); pos = m.end()
    out.append(text[pos:])
    return ''.join(out)

def clean_inline(h):
    h = re.sub(r'<a href="/Geschichte/K/graetz-gdj--(\d{3})-0*(\d+)"[^>]*>\[\d+\]</a>', lambda m: f'<small>[{band(m.group(1))}, {m.group(2)}]</small>', h)
    h = re.sub(r'<span class="zenoTXFontsize80">(.*?)</span>', r'<small>\1</small>', h, flags=re.S)
    h = re.sub(r'<span class="zenoTXSpaced">(.*?)</span>', r'<b>\1</b>', h, flags=re.S)
    h = re.sub(r'<(?!/?(?:i|b|small|sup|sub|br)\b)[^>]+>', '', h)  # übrige Tags weg
    h = html.unescape(h)
    return re.sub(r'\s+', ' ', fix_hebrew(h)).strip()

def page(p):
    s = raw(p)
    i = s.find('<div class="zenoCOMain">'); j = s.find('zenoCOFooter', i)
    body = s[i + 24: j if j > 0 else len(s)] if i >= 0 else ''
    body = re.sub(r'<h4>\s*Fußnoten\s*</h4>', '', body)
    # Fußnoten: <p><a name="F123"></a><a …#N123 …>7</a> Text</p>
    notes = {}
    def take(mm):
        notes[mm.group(1)] = clean_inline(mm.group(3)); return ''
    body = re.sub(r'<p>\s*<a name="F(\d+)"></a>\s*<a [^>]*>([^<]*)</a>(.*?)</p>', take, body, flags=re.S)
    # Fußnotenzeichen im Text: <a name="N123"></a><a href="…#F123" …>7</a> (Varianten abfangen)
    def mark(mm):
        n = mm.group(1); t = notes.get(n)
        return f'<sup class="footnote-marker">{mm.group(2)}</sup><i class="footnote">{t}</i>' if t is not None else ''
    body = re.sub(r'<a name="N\d+"></a>', '', body)
    body = re.sub(r'<a href="[^"]*#F(\d+)"[^>]*>(?:<sup>)?\s*([^<]{1,4}?)\s*(?:</sup>)?</a>', mark, body)
    paras = []
    for blk in re.findall(r'<(h\d|p)[^>]*>(.*?)</\1>', body, re.S):
        t = clean_inline(blk[1])
        if not t: continue
        paras.append(f'<b>{t}</b>' if blk[0].startswith('h') else t)
    return paras, len(notes)

leaves = [p for p in order if not tree[p]]
import collections
cnt = collections.Counter()
for p in leaves:
    for run in RUN.findall(html.unescape(raw(p))):
        e = evidence(run)
        if e: cnt.update(re.findall(r'[\u05D0-\u05EA]+', fix_run(run) if e > 0 else run))
FREQ = cnt
text, outline = [], []
cur_head = None
for p in leaves:
    rel = p[len(ROOT) + 1:]
    parts = [name('/' + x) for x in rel.split('/')]
    paras, nn = page(p)
    if not paras: continue
    text.append(paras)
    sec = len(text)
    head = ' · '.join(parts[:-1]) or parts[0]
    if head != cur_head:
        outline.append({'head': head, 'items': []}); cur_head = head
    outline[-1]['items'].append({'ref': f'{sec}:1', 'text': parts[-1]})
json.dump({'text': text, 'outline': outline}, open('graetz.json', 'w'), ensure_ascii=False)
print('Abschnitte', len(text), 'Absätze', sum(len(x) for x in text), 'Gliederungsköpfe', len(outline))
