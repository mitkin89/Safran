#!/usr/bin/env python3
"""Aleppo-Kodex (Text-Fabric-Datensatz von Martijn Naaijer, CACCHT) -> Safran, hebräische Version für alle 39 Bücher.
Aufruf: python3 -I aleppo.py <aleppo-Ordner mit tf/1.0> <Ordner mit tfload.py> <Safran-Projektordner>
Quelle: https://github.com/MartijnNaaijer/aleppo ; Text: „מקרא על פי המסורה“, he.wikisource.org (CC BY-SA 4.0)
Lesetext wie text-orig-full: Qere statt Ketiv, danach der Trailer (Leerzeichen, Maqaf, Sof Pasuq …)."""
import sys, os, re, json, hashlib, bisect
src, tfdir, proj = sys.argv[1:4]
sys.path.insert(0, tfdir)
from tfload import load
T = os.path.join(src, 'tf', '1.0') + '/'
FIX = {'Samuel_I': 'I Samuel', 'Samuel_II': 'II Samuel', 'Reges_I': 'I Kings', 'Reges_II': 'II Kings', 'Chronica_I': 'I Chronicles', 'Chronica_II': 'II Chronicles',
       'Canticum': 'Song of Songs', 'Deuteronomium': 'Deuteronomy', 'Numeri': 'Numbers', 'Josua': 'Joshua', 'Judices': 'Judges', 'Jesaia': 'Isaiah', 'Jeremia': 'Jeremiah',
       'Ezechiel': 'Ezekiel', 'Jona': 'Jonah', 'Micha': 'Micah', 'Habakuk': 'Habakkuk', 'Zephania': 'Zephaniah', 'Sacharia': 'Zechariah', 'Maleachi': 'Malachi', 'Obadia': 'Obadiah',
       'Psalmi': 'Psalms', 'Iob': 'Job', 'Proverbia': 'Proverbs', 'Threni': 'Lamentations', 'Esra': 'Ezra', 'Nehemia': 'Nehemiah', 'Ecclesiastes': 'Ecclesiastes'}
VT = 'Aleppo-Kodex (מקרא על פי המסורה, ETCBC-CACCHT)'
SRCURL = 'https://github.com/MartijnNaaijer/aleppo (CC BY-SA 4.0); Text: מקרא על פי המסורה, he.wikisource.org'
g = load(T + 'g_word_utf8.tf'); tr = load(T + 'trailer_utf8.tf'); qe = load(T + 'qere_utf8.tf'); qt = load(T + 'qere_trailer_utf8.tf')
book = load(T + 'book.tf'); chap = load(T + 'chapter.tf'); verse = load(T + 'verse.tf')
# oslots: Knoten ab maxSlot+1 der Reihe nach, je Zeile ein Bereich von Slots
NW = 426562
slots = {}; node = NW + 1
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
bnodes = sorted((slots[n][0][0], n) for n in book if n in slots and book[n])
bstart = [x[0] for x in bnodes]
def wtext(s):
    if qe.get(s): return qe[s] + (qt.get(s, '') or '')
    return (g.get(s, '') or '') + (tr.get(s, '') or '')
man_p = os.path.join(proj, 'bundled', 'manifest.json')
man = json.load(open(man_p)) if os.path.exists(man_p) else {'version': 1, 'items': []}
meta = {}
for it in json.load(open(os.path.join(proj, 'bundled', 'manifest.json')))['items']: meta.setdefault(it['title'], it)
man['items'] = [it for it in man['items'] if it['versionTitle'] != VT]
books = {}
for vn, v in verse.items():
    if vn not in slots or not re.fullmatch(r'\d+', str(v)): continue
    s0 = slots[vn][0][0]
    b = book[bnodes[bisect.bisect_right(bstart, s0) - 1][1]]
    c = chap[vn]
    txt = ''.join(wtext(s) for a, z in slots[vn] for s in range(a, z + 1))
    txt = re.sub(r'\s+', ' ', txt).strip()
    books.setdefault(FIX.get(b, b), {}).setdefault(int(c), {})[int(v)] = txt
for title, chs in sorted(books.items()):
    arr = []
    for c in range(1, max(chs) + 1):
        vs = chs.get(c, {}); n = max(vs) if vs else 0
        arr.append([vs.get(x, '') for x in range(1, n + 1)])
    he = meta.get(title, {})
    data = {'title': title, 'heTitle': he.get('heTitle', title), 'language': 'Hebrew', 'versionTitle': VT, 'versionSource': SRCURL,
            'sectionNames': ['Chapter', 'Verse'], 'text': arr}
    rel = 'own/%s/he/%s.json' % (title, VT)
    p = os.path.join(proj, 'bundled', rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    raw = json.dumps(data, ensure_ascii=False); open(p, 'w', encoding='utf8').write(raw)
    man['items'].append({'rel': rel, 'title': title, 'heTitle': data['heTitle'], 'language': 'Hebrew', 'versionTitle': VT,
                         'categories': he.get('categories', ['Tanakh']), 'kind': 'he', 'hash': hashlib.sha1(raw.encode()).hexdigest()})
    print(title, len(arr), 'Kapitel', sum(1 for r in arr for x in r if x), 'Verse', '' if he else '(!) nicht im Manifest')
json.dump(man, open(man_p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
